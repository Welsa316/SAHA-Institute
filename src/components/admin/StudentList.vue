<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAdminApi } from '../../composables/useAdminApi.js'
import { useModalA11y } from '../../composables/useModalA11y.js'
import { formatPhoneDisplay } from '../../utils/phone.js'
import PageHeader from './PageHeader.vue'
import GradePill from './GradePill.vue'
import InlineNotes from './InlineNotes.vue'
import ConfirmDialog from './ConfirmDialog.vue'

// Year-round (regular) tutoring roster. Rows are created by students
// registering their own accounts at /register (student name + parent email +
// parent phone + password). New registrations wait in the Pending approval
// queue — parent contact info is shown there so the team can verify the
// family is real before approving.
//
// No payment UI here on purpose: tutoring payments are handled off-platform
// and not tracked on the site. Homework management lives in each student's
// detail modal.

const props = defineProps({
  endpoint: { type: String, required: true }, // /api/students
  title: { type: String, required: true },
  eyebrow: { type: String, required: true },
  emptyMessage: { type: String, default: 'No students enrolled yet.' },
  // Homework management in the detail modal (on for the Students roster).
  allowAssignments: { type: Boolean, default: false },
})

const api = useAdminApi()

const students = ref([])
const loading = ref(true)
const error = ref('')
const rowSaving = ref(new Set())

const toDeleteId = ref(null)
const detailRow = ref(null) // when set, the detail modal opens with this row

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await api.get(props.endpoint)
    students.value = data.students ?? []
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(load)

// Pending self-registrations (approved=false) — surfaced in their own section
// at the top so the admin can vet them before they hit the roster. Newest
// first so fresh registrations are right there.
const pending = computed(() =>
  students.value
    .filter((s) => !s.approved)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
)

// Group APPROVED students by grade level for the roster tabs. The `unassigned`
// bucket catches approved rows that still have no grade.
const grouped = computed(() => {
  const groups = { elementary: [], middle: [], high: [], unassigned: [] }
  for (const s of students.value) {
    if (!s.approved) continue // pending rows live in their own section
    const key = groups[s.gradeLevel] ? s.gradeLevel : 'unassigned'
    groups[key].push(s)
  }
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => a.studentName.localeCompare(b.studentName))
  }
  return groups
})

const gradeOrder = ['elementary', 'middle', 'high', 'unassigned']

const gradeLabels = {
  elementary: 'Elementary',
  middle: 'Middle School',
  high: 'High School',
  unassigned: 'Unassigned grade',
}

const gradeTabLabels = {
  elementary: 'Elementary',
  middle: 'Middle',
  high: 'High',
  unassigned: 'Unassigned',
}

// One tab per grade that actually has students; only the active grade's table
// renders.
const gradeTabs = computed(() => gradeOrder.filter((g) => grouped.value[g].length > 0))

const activeGrade = ref('elementary')

watch(
  gradeTabs,
  (tabs) => {
    if (tabs.length && !tabs.includes(activeGrade.value)) {
      activeGrade.value = tabs[0]
    }
  },
  { immediate: true },
)

async function patch(row, patchBody) {
  rowSaving.value.add(row.id)
  const prev = { ...row }
  Object.assign(row, patchBody)
  try {
    const data = await api.patch(`${props.endpoint}/${row.id}`, patchBody)
    Object.assign(row, data.student)
    if (detailRow.value?.id === row.id) detailRow.value = { ...row }
  } catch (err) {
    Object.assign(row, prev)
    error.value = err.message
  } finally {
    rowSaving.value.delete(row.id)
  }
}

function isSaving(id) {
  return rowSaving.value.has(id)
}

// ---------- Approval ----------
async function approve(row) {
  await patch(row, { approved: true })
}

// Grade is admin-managed — students never pick their own.
async function setGrade(row, gradeLevel) {
  if (!gradeLevel) return
  await patch(row, { gradeLevel })
}

async function confirmDelete() {
  const id = toDeleteId.value
  if (!id) return
  toDeleteId.value = null
  if (detailRow.value?.id === id) detailRow.value = null
  try {
    await api.delete(`${props.endpoint}/${id}`)
    students.value = students.value.filter((s) => s.id !== id)
  } catch (err) {
    error.value = err.message
  }
}

function formatRegistered(value) {
  if (!value) return '—'
  const d = new Date(value)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Parent contact for a row: registered accounts carry parent email + phone;
// legacy admin-entered rows may only have a parent name.
function parentContact(row) {
  return row.parentEmail ?? row.parentName ?? '—'
}

function openDetail(row) {
  detailRow.value = { ...row }
}

// Accessibility: focus trap + ESC + scroll lock + focus restore.
const detailPanel = ref(null)
useModalA11y(() => !!detailRow.value, detailPanel, () => { detailRow.value = null })

// ---------- Assignments (homework) ----------
const assignments = ref([])
const assignmentsLoading = ref(false)
const assignmentError = ref('')
const assignmentSaving = ref(false)
const newAssignment = ref({ title: '', details: '', dueDate: '' })

watch(
  () => detailRow.value?.id,
  async (id) => {
    assignments.value = []
    assignmentError.value = ''
    if (!id || !props.allowAssignments) return
    assignmentsLoading.value = true
    try {
      const data = await api.get(`/api/assignments?studentId=${id}`)
      assignments.value = data.assignments ?? []
    } catch (err) {
      assignmentError.value = err.message
    } finally {
      assignmentsLoading.value = false
    }
  },
)

async function addAssignment() {
  assignmentError.value = ''
  const { title, details, dueDate } = newAssignment.value
  if (!title.trim()) {
    assignmentError.value = 'A title is required.'
    return
  }
  assignmentSaving.value = true
  try {
    const data = await api.post('/api/assignments', {
      studentId: detailRow.value.id,
      title: title.trim(),
      details: details.trim() || null,
      dueDate: dueDate || null,
    })
    assignments.value.unshift(data.assignment)
    newAssignment.value = { title: '', details: '', dueDate: '' }
  } catch (err) {
    assignmentError.value = err.message
  } finally {
    assignmentSaving.value = false
  }
}

async function toggleAssignmentDone(a) {
  const prev = a.completed
  a.completed = !prev
  try {
    const data = await api.patch(`/api/assignments/${a.id}`, { completed: a.completed })
    Object.assign(a, data.assignment)
  } catch (err) {
    a.completed = prev
    assignmentError.value = err.message
  }
}

async function deleteAssignment(a) {
  try {
    await api.delete(`/api/assignments/${a.id}`)
    assignments.value = assignments.value.filter((x) => x.id !== a.id)
  } catch (err) {
    assignmentError.value = err.message
  }
}

function daysUntil(yyyyMmDd) {
  if (!yyyyMmDd) return null
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  const t0 = new Date()
  const target = new Date(y, m - 1, d)
  const today = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate())
  return Math.round((target - today) / 86400000)
}

function dueBadge(a) {
  if (!a.dueDate) return null
  const days = daysUntil(a.dueDate)
  const base = 'inline-block px-2 py-0.5 rounded-full text-[10px] font-body font-bold border whitespace-nowrap'
  if (a.completed) return { class: `${base} bg-navy-50 text-navy-400 border-navy-200`, label: `Due ${a.dueDate}` }
  if (days < 0) return { class: `${base} bg-red-50 text-red-700 border-red-200`, label: `Overdue · ${a.dueDate}` }
  if (days === 0) return { class: `${base} bg-amber-50 text-amber-800 border-amber-200`, label: 'Due today' }
  return { class: `${base} bg-academic-50 text-academic-700 border-academic-200`, label: `Due ${a.dueDate}` }
}
</script>

<template>
  <main>
    <PageHeader :eyebrow="eyebrow" :title="title" :count="students.length" />

    <div v-if="error" role="alert" class="mx-6 md:mx-10 mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-body">
      {{ error }}
    </div>

    <div class="px-6 md:px-10 py-8 space-y-10">
      <div v-if="loading" role="status" class="py-16 text-center font-body text-sm text-navy-400">Loading…</div>
      <div v-else-if="students.length === 0" class="py-16 text-center">
        <p class="font-body text-sm text-navy-400">{{ emptyMessage }}</p>
      </div>

      <!-- Pending approval — registrations awaiting review. Parent contact is
           shown so the team can verify the family before approving. -->
      <section v-if="pending.length > 0">
        <div class="flex items-center gap-3 mb-3">
          <h2 class="font-heading text-lg font-bold text-amber-700 tracking-tight">Pending approval</h2>
          <span class="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-amber-100 text-amber-800 font-body text-xs font-bold">{{ pending.length }}</span>
        </div>
        <div class="bg-amber-50/60 rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-amber-100/50">
                <tr>
                  <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800">Student</th>
                  <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800">Parent email</th>
                  <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800">Parent phone</th>
                  <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800">Registered</th>
                  <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800">Assign grade</th>
                  <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800 text-right">Review</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-amber-200/70">
                <tr v-for="row in pending" :key="row.id" class="hover:bg-amber-100/30 transition-colors">
                  <td class="px-4 py-4 font-body font-semibold text-navy-900 break-words">{{ row.studentName }}</td>
                  <td class="px-4 py-4 font-body text-xs text-navy-600 break-all">{{ row.parentEmail ?? '—' }}</td>
                  <td class="px-4 py-4 font-body text-xs text-navy-600 whitespace-nowrap">{{ formatPhoneDisplay(row.phoneNumber) }}</td>
                  <td class="px-4 py-4 font-body text-xs text-navy-500 whitespace-nowrap">{{ formatRegistered(row.createdAt) }}</td>
                  <td class="px-4 py-4">
                    <select
                      :value="row.gradeLevel ?? ''"
                      :disabled="isSaving(row.id)"
                      @change="(e) => setGrade(row, e.target.value)"
                      :aria-label="`Assign grade for ${row.studentName}`"
                      class="px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-navy-700 text-xs font-body font-semibold focus:outline-none focus:ring-2 focus:ring-academic-400/40 disabled:opacity-50"
                    >
                      <option value="" disabled>Choose grade…</option>
                      <option value="elementary">Elementary</option>
                      <option value="middle">Middle School</option>
                      <option value="high">High School</option>
                    </select>
                  </td>
                  <td class="px-4 py-4">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        :disabled="isSaving(row.id)"
                        @click="approve(row)"
                        class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 text-white font-body text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 focus:outline-none"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        Approve
                      </button>
                      <button
                        type="button"
                        @click="toDeleteId = row.id"
                        class="p-2 rounded-lg text-navy-400 hover:bg-red-50 hover:text-red-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 focus:outline-none"
                        aria-label="Reject and delete registration"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <template v-if="students.length > 0 && gradeTabs.length > 0">
        <!-- Grade tabs — one per grade that has students. -->
        <div role="tablist" aria-label="Filter roster by grade" class="flex flex-wrap gap-1 border-b border-navy-100">
          <button
            v-for="grade in gradeTabs"
            :key="`tab-${grade}`"
            type="button"
            role="tab"
            :aria-selected="activeGrade === grade"
            @click="activeGrade = grade"
            class="relative px-4 py-2.5 -mb-px border-b-2 font-body text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
            :class="activeGrade === grade
              ? 'text-[#001B3D] border-[#001B3D]'
              : 'text-navy-400 border-transparent hover:text-navy-700'"
          >
            {{ gradeTabLabels[grade] }}
            <span class="ml-1.5 text-xs font-bold" :class="activeGrade === grade ? 'text-academic-600' : 'text-navy-300'">{{ grouped[grade].length }}</span>
          </button>
        </div>

        <template v-for="grade in gradeTabs" :key="grade">
          <section v-if="grade === activeGrade">
          <div v-if="grouped[grade].length > 0">
            <div class="flex items-center gap-3 mb-3">
              <h2 class="font-heading text-lg font-bold text-[#001B3D] tracking-tight">{{ gradeLabels[grade] }}</h2>
              <GradePill v-if="grade !== 'unassigned'" :grade="grade" size="sm" />
              <span class="font-body text-xs text-navy-400">{{ grouped[grade].length }}</span>
            </div>
            <div class="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead class="bg-navy-50/60">
                    <tr>
                      <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Student</th>
                      <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Parent email</th>
                      <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Parent phone</th>
                      <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Notes</th>
                      <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-navy-100">
                    <tr
                      v-for="row in grouped[grade]"
                      :key="row.id"
                      class="align-top hover:bg-navy-50/40 transition-colors cursor-pointer"
                      @click="openDetail(row)"
                    >
                      <td class="px-4 py-4 font-body font-semibold text-navy-900 break-words">{{ row.studentName }}</td>
                      <td class="px-4 py-4 font-body text-navy-600 text-xs break-all">{{ parentContact(row) }}</td>
                      <td class="px-4 py-4 font-body text-navy-600 text-sm whitespace-nowrap">{{ formatPhoneDisplay(row.phoneNumber) }}</td>
                      <td class="px-4 py-4" @click.stop>
                        <InlineNotes
                          :model-value="row.notes"
                          :saving="isSaving(row.id)"
                          placeholder="Add a note…"
                          @save="(v) => patch(row, { notes: v })"
                        />
                      </td>
                      <td class="px-4 py-4 text-right whitespace-nowrap" @click.stop>
                        <button
                          type="button"
                          @click="openDetail(row)"
                          class="p-2 rounded-lg text-navy-400 hover:bg-navy-50 hover:text-navy-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
                          :aria-label="`Open details for ${row.studentName}`"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          @click="toDeleteId = row.id"
                          class="p-2 rounded-lg text-navy-400 hover:bg-red-50 hover:text-red-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 focus:outline-none"
                          :aria-label="`Delete ${row.studentName}`"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          </section>
        </template>
      </template>
    </div>

    <!-- Student detail modal. :duration guarantees the leave completes on a
         timer so the backdrop is always removed. -->
    <Transition
      :duration="{ enter: 150, leave: 100 }"
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in pointer-events-none"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="detailRow" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" @click.self="detailRow = null">
        <div ref="detailPanel" role="dialog" aria-modal="true" aria-labelledby="student-detail-title" class="bg-white rounded-2xl shadow-2xl shadow-black/20 max-w-lg w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto">
          <div class="flex items-start justify-between gap-4 mb-5">
            <div>
              <p class="font-body text-[10px] tracking-[0.2em] uppercase text-academic-600 font-bold mb-1">Student detail</p>
              <h2 id="student-detail-title" class="font-heading text-2xl font-bold text-[#001B3D] tracking-tight leading-tight break-words">{{ detailRow.studentName }}</h2>
            </div>
            <button
              type="button"
              @click="detailRow = null"
              aria-label="Close"
              class="p-1.5 -mt-1 -mr-1 rounded-lg text-navy-400 hover:bg-navy-50 hover:text-navy-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <dl class="grid grid-cols-2 gap-4 mb-6">
            <div>
              <dt class="font-body text-[10px] tracking-wider uppercase font-bold text-navy-500 mb-1">Grade</dt>
              <dd>
                <select
                  :value="detailRow.gradeLevel ?? ''"
                  :disabled="isSaving(detailRow.id)"
                  @change="(e) => setGrade(detailRow, e.target.value)"
                  aria-label="Grade level"
                  class="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-navy-200 text-navy-700 text-sm font-body focus:outline-none focus:ring-2 focus:ring-academic-400/40 disabled:opacity-50"
                >
                  <option value="" disabled>Not set</option>
                  <option value="elementary">Elementary</option>
                  <option value="middle">Middle School</option>
                  <option value="high">High School</option>
                </select>
              </dd>
            </div>
            <div>
              <dt class="font-body text-[10px] tracking-wider uppercase font-bold text-navy-500 mb-1">Parent phone</dt>
              <dd class="font-body text-sm text-navy-800">{{ formatPhoneDisplay(detailRow.phoneNumber) }}</dd>
            </div>
            <div class="col-span-2">
              <dt class="font-body text-[10px] tracking-wider uppercase font-bold text-navy-500 mb-1">Parent email</dt>
              <dd class="font-body text-sm text-navy-800 break-all">{{ detailRow.parentEmail ?? '—' }}</dd>
            </div>
          </dl>

          <div class="mb-6">
            <p class="font-body text-[10px] tracking-wider uppercase font-bold text-navy-500 mb-1.5">Notes</p>
            <p v-if="detailRow.notes" class="font-body text-sm text-navy-700 whitespace-pre-wrap break-words leading-relaxed">{{ detailRow.notes }}</p>
            <p v-else class="font-body text-sm text-navy-300 italic">No notes yet.</p>
          </div>

          <!-- Homework -->
          <div v-if="allowAssignments" class="mb-6 pt-5 border-t border-navy-100">
            <p class="font-body text-[10px] tracking-wider uppercase font-bold text-navy-500 mb-2">Homework</p>

            <div v-if="assignmentError" role="alert" class="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-body">
              {{ assignmentError }}
            </div>

            <div v-if="assignmentsLoading" role="status" class="py-3 font-body text-xs text-navy-400">Loading…</div>
            <p v-else-if="assignments.length === 0" class="font-body text-sm text-navy-300 italic mb-3">Nothing assigned yet.</p>

            <ul v-else class="space-y-2 mb-4 max-h-56 overflow-y-auto pr-1">
              <li
                v-for="a in assignments"
                :key="a.id"
                class="flex items-start gap-3 p-3 rounded-xl border"
                :class="a.completed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-navy-100'"
              >
                <button
                  type="button"
                  @click="toggleAssignmentDone(a)"
                  :aria-pressed="a.completed"
                  :aria-label="a.completed ? 'Mark not done' : 'Mark done'"
                  class="mt-0.5 w-5 h-5 shrink-0 rounded border flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
                  :class="a.completed ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-navy-300 hover:border-academic-400'"
                >
                  <svg v-if="a.completed" class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="font-body text-sm font-semibold break-words min-w-0" :class="a.completed ? 'text-navy-400 line-through' : 'text-navy-900'">{{ a.title }}</p>
                    <span v-if="dueBadge(a)" :class="dueBadge(a).class">{{ dueBadge(a).label }}</span>
                  </div>
                  <p v-if="a.details" class="font-body text-xs text-navy-500 mt-0.5 whitespace-pre-wrap break-words">{{ a.details }}</p>
                </div>
                <button
                  type="button"
                  @click="deleteAssignment(a)"
                  aria-label="Delete assignment"
                  class="p-1.5 rounded-lg text-navy-300 hover:bg-red-50 hover:text-red-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 focus:outline-none"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            </ul>

            <!-- Add homework -->
            <form @submit.prevent="addAssignment" class="space-y-2">
              <input
                v-model="newAssignment.title"
                type="text"
                required
                :disabled="assignmentSaving"
                aria-label="Assignment title"
                placeholder="Assignment title (e.g. Math worksheet p. 12)"
                class="w-full px-3 py-2 rounded-lg bg-white border border-navy-200 text-navy-800 font-body text-sm placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 disabled:opacity-50"
              />
              <textarea
                v-model="newAssignment.details"
                rows="2"
                :disabled="assignmentSaving"
                aria-label="Assignment details (optional)"
                placeholder="Details (optional)"
                class="w-full px-3 py-2 rounded-lg bg-white border border-navy-200 text-navy-800 font-body text-sm placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 resize-none disabled:opacity-50"
              ></textarea>
              <div class="flex items-center gap-2">
                <input
                  v-model="newAssignment.dueDate"
                  type="date"
                  :disabled="assignmentSaving"
                  aria-label="Due date (optional)"
                  class="px-2.5 py-1.5 rounded-lg bg-white border border-navy-200 text-navy-700 text-xs font-body focus:outline-none focus:ring-2 focus:ring-academic-400/40 disabled:opacity-50"
                />
                <button
                  type="submit"
                  :disabled="assignmentSaving"
                  class="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#001B3D] text-white font-body text-xs font-bold uppercase tracking-wider hover:bg-navy-800 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  {{ assignmentSaving ? 'Assigning…' : 'Assign' }}
                </button>
              </div>
            </form>
          </div>

          <div class="flex justify-between items-center pt-4 border-t border-navy-100">
            <button
              type="button"
              @click="toDeleteId = detailRow.id"
              class="text-red-600 hover:text-red-700 font-body text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 focus:outline-none"
            >
              Delete student
            </button>
            <button
              type="button"
              @click="detailRow = null"
              class="px-5 py-2.5 rounded-full bg-[#001B3D] text-white text-sm font-body font-semibold hover:bg-navy-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <ConfirmDialog
      :show="toDeleteId !== null"
      title="Remove this student?"
      message="This permanently deletes the row (and any homework on it). You can't undo this."
      confirm-label="Delete"
      danger
      @confirm="confirmDelete"
      @cancel="toDeleteId = null"
    />
  </main>
</template>
