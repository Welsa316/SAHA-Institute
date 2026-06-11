<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAdminApi } from '../../composables/useAdminApi.js'
import { useModalA11y } from '../../composables/useModalA11y.js'
import PageHeader from './PageHeader.vue'
import GradePill from './GradePill.vue'
import ToggleSwitch from './ToggleSwitch.vue'
import InlineNotes from './InlineNotes.vue'
import ConfirmDialog from './ConfirmDialog.vue'

// Shared list/CRUD UI for the three roster pages — Summer Camp, STEM Program, and the
// year-round Students master roster. The pages differ only in copy, the underlying
// API path, and whether they surface the `paid_from` field (Students yes, the camps no),
// so one component drives all three and program-specific config comes in via props.

const props = defineProps({
  endpoint: { type: String, required: true }, // /api/summer-camp | /api/stem-program | /api/students
  title: { type: String, required: true },
  eyebrow: { type: String, required: true },
  subtitle: { type: String, default: '' }, // optional — pages can hide it by omitting
  emptyMessage: { type: String, default: 'No students enrolled yet.' },
  // Only the Students master roster surfaces the "paid from" billing-window start. The
  // camp pages keep that column hidden because Mrs. Anila tracks only the expiry there.
  showPaidFrom: { type: Boolean, default: false },
  // Whether to show the "Add student" button + form modal. Summer Camp and
  // STEM Program use manual entry (Anila adds names off-channel), so this is
  // on by default. The year-round Students roster turns it off — those rows
  // will be created automatically when student self-registration ships.
  allowAdd: { type: Boolean, default: true },
  // Homework management in the detail modal. Only the year-round Students
  // roster turns this on — assignments go to students with portal accounts,
  // not camp/STEM roster rows.
  allowAssignments: { type: Boolean, default: false },
})

const api = useAdminApi()

const students = ref([])
const loading = ref(true)
const error = ref('')
const rowSaving = ref(new Set())

const toDeleteId = ref(null)
const detailRow = ref(null) // when set, the detail modal opens with this row

const addOpen = ref(false)
const addSaving = ref(false)
const addForm = ref(emptyAddForm())
const addError = ref('')

function emptyAddForm() {
  return {
    parentName: '',
    studentName: '',
    gradeLevel: 'elementary',
    phoneNumber: '',
    notes: '',
  }
}

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

// Pending self-signups (approved=false) — surfaced in their own section at the
// top so the admin can vet them before they hit the real roster. Newest first
// so fresh signups are right there.
const pending = computed(() =>
  students.value
    .filter((s) => !s.approved)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
)

// Group APPROVED students by grade level for the roster table. The `unassigned`
// bucket catches approved rows that still have no grade (e.g. a signup approved
// before a grade was set) so they never silently disappear.
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

// Order the unassigned group last so brand-new signups surface at the bottom
// where the admin expects "needs attention" rows.
const gradeOrder = ['elementary', 'middle', 'high', 'unassigned']

const gradeLabels = {
  elementary: 'Elementary',
  middle: 'Middle School',
  high: 'High School',
  unassigned: 'Unassigned grade',
}

// Shorter labels for the tab strip (the section headers carry the full names).
const gradeTabLabels = {
  elementary: 'Elementary',
  middle: 'Middle',
  high: 'High',
  unassigned: 'Unassigned',
}

// One tab per grade that actually has students — keeps the strip from showing
// empty buckets. The roster shows only the active grade's table now (the user
// didn't want all three grades stacked on one page).
const gradeTabs = computed(() => gradeOrder.filter((g) => grouped.value[g].length > 0))

const activeGrade = ref('elementary')

// Keep the active tab valid: if it empties out (last student in it moved or
// deleted) or the default isn't present, snap to the first available tab.
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
    // If the row's open in the detail modal, refresh its bound copy too.
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
// Approve a pending signup. It immediately drops out of the pending section and
// joins the grade-grouped roster (under its assigned grade, or Unassigned).
async function approve(row) {
  await patch(row, { approved: true })
}

// Admin assigns / changes a student's grade. This is the "separate form" for
// grade management — students never pick their own grade at signup.
async function setGrade(row, gradeLevel) {
  if (!gradeLevel) return
  await patch(row, { gradeLevel })
}

// ---------- Billing cycle helpers ----------
// "Reasonable paid-until cycles" per the spec: one click sets the next
// 30-day window. Smart base date — if the row is currently paid through a
// future date, extend FROM that date (so a 2-day-early renew doesn't drop
// the family's remaining time); otherwise extend from today (lapsed renews
// from now).

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(yyyyMmDd, days) {
  // Parse as local-date (no UTC shift); the date column doesn't carry time.
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

// Days between today and paidUntil. Positive = days remaining; negative =
// days lapsed; null = no paid_until set.
function daysUntil(yyyyMmDd) {
  if (!yyyyMmDd) return null
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  const t = new Date()
  const target = new Date(y, m - 1, d)
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate())
  return Math.round((target - today) / 86400000)
}

// "fresh" = paid + plenty of runway left; "warning" = paid but expiring in
// the next 14 days; "expired" = paid in the past; "none" = never set.
function billingStatus(row) {
  if (!row.paid) return 'none'
  const days = daysUntil(row.paidUntil)
  if (days === null) return 'active' // marked paid with no expiry — treat as fine
  if (days < 0) return 'expired'
  if (days <= 14) return 'warning'
  return 'fresh'
}

function billingBadge(row) {
  const status = billingStatus(row)
  const base = 'inline-block px-2.5 py-0.5 rounded-full text-[11px] font-body font-bold border whitespace-nowrap'
  const days = daysUntil(row.paidUntil)
  if (status === 'fresh') return { class: `${base} bg-emerald-50 text-emerald-700 border-emerald-200`, label: `Paid · ${days}d left` }
  if (status === 'warning') return { class: `${base} bg-amber-50 text-amber-800 border-amber-200`, label: days === 0 ? 'Expires today' : `Expires in ${days}d` }
  if (status === 'expired') return { class: `${base} bg-red-50 text-red-700 border-red-200`, label: `Expired ${Math.abs(days)}d ago` }
  if (status === 'active') return { class: `${base} bg-emerald-50 text-emerald-700 border-emerald-200`, label: 'Paid' }
  return { class: `${base} bg-navy-50 text-navy-500 border-navy-200`, label: 'Not paid' }
}

// Click handler for the quick-action button. Behaviour depends on row state:
//   - Not paid yet -> mark paid, set paid_from=today, paid_until=today+30
//   - Already paid -> extend paid_until by 30 days from the smarter base
async function quickRenew(row, days = 30) {
  const today = todayStr()
  if (!row.paid) {
    await patch(row, { paid: true, paidFrom: today, paidUntil: addDays(today, days) })
    return
  }
  // Extend from current paid_until if still in the future; otherwise from today.
  const base = row.paidUntil && row.paidUntil >= today ? row.paidUntil : today
  await patch(row, { paid: true, paidUntil: addDays(base, days) })
}

async function confirmDelete() {
  const id = toDeleteId.value
  if (!id) return
  toDeleteId.value = null
  // If the detail modal was open on this row, close it too.
  if (detailRow.value?.id === id) detailRow.value = null
  try {
    await api.delete(`${props.endpoint}/${id}`)
    students.value = students.value.filter((s) => s.id !== id)
  } catch (err) {
    error.value = err.message
  }
}

function openAdd() {
  addError.value = ''
  addForm.value = emptyAddForm()
  addOpen.value = true
}

async function submitAdd() {
  addError.value = ''
  const { parentName, studentName, gradeLevel, phoneNumber, notes } = addForm.value
  if (!parentName.trim() || !studentName.trim()) {
    addError.value = 'Parent and student names are required.'
    return
  }
  addSaving.value = true
  try {
    const data = await api.post(props.endpoint, {
      parentName: parentName.trim(),
      studentName: studentName.trim(),
      gradeLevel,
      phoneNumber: phoneNumber.trim() || null,
      notes: notes.trim() || null,
    })
    students.value.push(data.student)
    addOpen.value = false
  } catch (err) {
    addError.value = err.message
  } finally {
    addSaving.value = false
  }
}

function formatPhone(value) {
  if (!value) return '—'
  return value
}

function formatRegistered(value) {
  if (!value) return '—'
  const d = new Date(value)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function openDetail(row) {
  // Pass a shallow copy so edits in the modal don't leak back until PATCH succeeds.
  detailRow.value = { ...row }
}

// Accessibility: focus trap + ESC + scroll lock + focus restore for both modals.
// Panel refs are attached to each dialog's panel element in the template.
const addPanel = ref(null)
const detailPanel = ref(null)
useModalA11y(() => addOpen.value, addPanel, () => { addOpen.value = false })
useModalA11y(() => !!detailRow.value, detailPanel, () => { detailRow.value = null })

// ---------- Assignments (homework) ----------
// Loaded when the detail modal opens (only on rosters with allowAssignments).
// Teacher can add, delete, and toggle completion; the student sees the same
// list in their portal and can mark items done.

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
    <PageHeader :eyebrow="eyebrow" :title="title" :subtitle="subtitle" :count="students.length">
      <template v-if="allowAdd" #actions>
        <button
          type="button"
          @click="openAdd"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#001B3D] text-white font-body text-sm font-bold tracking-wider uppercase hover:bg-navy-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add student
        </button>
      </template>
    </PageHeader>

    <div v-if="error" role="alert" class="mx-6 md:mx-10 mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-body">
      {{ error }}
    </div>

    <div class="px-6 md:px-10 py-8 space-y-10">
      <div v-if="loading" role="status" class="py-16 text-center font-body text-sm text-navy-400">Loading…</div>
      <div v-else-if="students.length === 0" class="py-16 text-center">
        <p class="font-body text-sm text-navy-400">{{ emptyMessage }}</p>
      </div>

      <!-- Pending approval — self-signups awaiting review. Vet here (assign a
           grade, approve) or delete if it doesn't look real, before they reach
           the roster below. -->
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
                  <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800">Name</th>
                  <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800">Registered</th>
                  <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800">Assign grade</th>
                  <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800 text-right">Review</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-amber-200/70">
                <tr v-for="row in pending" :key="row.id" class="hover:bg-amber-100/30 transition-colors">
                  <td class="px-4 py-4 font-body font-semibold text-navy-900 break-words">{{ row.studentName }}</td>
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
                        aria-label="Reject and delete signup"
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
        <!-- Grade tabs — one per grade that has students. Only the active
             grade's table renders below, so the three grades aren't stacked
             on one long page. -->
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
                      <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Parent</th>
                      <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Student</th>
                      <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Phone</th>
                      <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Paid</th>
                      <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Billing status</th>
                      <th v-if="showPaidFrom" scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Paid from</th>
                      <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Paid until</th>
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
                      <td class="px-4 py-4 font-body font-semibold text-navy-900 break-words">{{ row.parentName }}</td>
                      <td class="px-4 py-4 font-body text-navy-700 break-words">{{ row.studentName }}</td>
                      <td class="px-4 py-4 font-body text-navy-600 text-sm whitespace-nowrap">{{ formatPhone(row.phoneNumber) }}</td>
                      <!-- The toggles/inputs below have @click.stop so a misfire on the input doesn't open the detail modal. -->
                      <td class="px-4 py-4" @click.stop>
                        <ToggleSwitch
                          :model-value="row.paid"
                          :disabled="isSaving(row.id)"
                          label="Mark paid"
                          @update:model-value="(v) => patch(row, { paid: v })"
                        />
                      </td>
                      <td class="px-4 py-4" @click.stop>
                        <!-- Status badge + one-click cycle action. The button
                             relabels based on row state: unpaid -> "Mark paid +1mo"
                             (turns on paid + sets a 30-day window starting today);
                             already paid -> "Renew +1mo" (extends paid_until by 30
                             days from the smarter base date). -->
                        <div class="flex flex-col items-start gap-1.5">
                          <span :class="billingBadge(row).class">{{ billingBadge(row).label }}</span>
                          <button
                            type="button"
                            :disabled="isSaving(row.id)"
                            @click="quickRenew(row, 30)"
                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-academic-50 text-academic-700 border border-academic-200 hover:bg-academic-100 hover:border-academic-300 font-body text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
                          >
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {{ row.paid ? 'Renew +1mo' : 'Mark paid +1mo' }}
                          </button>
                        </div>
                      </td>
                      <td v-if="showPaidFrom" class="px-4 py-4" @click.stop>
                        <input
                          type="date"
                          :value="row.paidFrom ?? ''"
                          :disabled="!row.paid || isSaving(row.id)"
                          @change="(e) => patch(row, { paidFrom: e.target.value || null })"
                          :aria-label="`Paid from date for ${row.studentName}`"
                          class="px-2 py-1 rounded-lg bg-navy-50 border border-navy-100 text-navy-700 text-xs font-body focus:outline-none focus:ring-2 focus:ring-academic-400/40 disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td class="px-4 py-4" @click.stop>
                        <input
                          type="date"
                          :value="row.paidUntil ?? ''"
                          :disabled="!row.paid || isSaving(row.id)"
                          @change="(e) => patch(row, { paidUntil: e.target.value || null })"
                          :aria-label="`Paid until date for ${row.studentName}`"
                          class="px-2 py-1 rounded-lg bg-navy-50 border border-navy-100 text-navy-700 text-xs font-body focus:outline-none focus:ring-2 focus:ring-academic-400/40 disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td class="px-4 py-4" @click.stop>
                        <InlineNotes
                          :model-value="row.notes"
                          :saving="isSaving(row.id)"
                          placeholder="Add a note…"
                          @save="(v) => patch(row, { notes: v })"
                        />
                      </td>
                      <td class="px-4 py-4 text-right whitespace-nowrap" @click.stop>
                        <!-- Keyboard-reachable way into the detail modal (where
                             homework + grade live). The row @click is a mouse
                             convenience; this button is the accessible path. -->
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

    <!-- Add student modal — only mounted when manual entry is allowed.
         :duration makes Vue finish the leave on a timer instead of relying on
         transitionend, which automated browsers (and backgrounded tabs) can
         fail to fire — otherwise the invisible backdrop can linger in the DOM. -->
    <Transition
      v-if="allowAdd"
      :duration="{ enter: 150, leave: 100 }"
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in pointer-events-none"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="addOpen" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" @click.self="addOpen = false">
        <div ref="addPanel" role="dialog" aria-modal="true" aria-labelledby="add-student-title" class="bg-white rounded-2xl shadow-2xl shadow-black/20 max-w-md w-full p-6 md:p-7">
          <h2 id="add-student-title" class="font-heading text-xl font-bold text-[#001B3D] mb-4">Add student</h2>
          <div v-if="addError" role="alert" class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {{ addError }}
          </div>
          <form @submit.prevent="submitAdd" class="space-y-4">
            <div>
              <label class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Parent name</label>
              <input
                v-model="addForm.parentName"
                type="text"
                required
                :disabled="addSaving"
                class="w-full px-3 py-2 rounded-lg bg-slate-50 border border-navy-100 text-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400"
              />
            </div>
            <div>
              <label class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Student name</label>
              <input
                v-model="addForm.studentName"
                type="text"
                required
                :disabled="addSaving"
                class="w-full px-3 py-2 rounded-lg bg-slate-50 border border-navy-100 text-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400"
              />
            </div>
            <div>
              <label class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Grade level</label>
              <select
                v-model="addForm.gradeLevel"
                :disabled="addSaving"
                class="w-full px-3 py-2 rounded-lg bg-slate-50 border border-navy-100 text-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400"
              >
                <option value="elementary">Elementary</option>
                <option value="middle">Middle School</option>
                <option value="high">High School</option>
              </select>
            </div>
            <div>
              <label class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Phone number</label>
              <input
                v-model="addForm.phoneNumber"
                type="tel"
                :disabled="addSaving"
                placeholder="(504) 373-9778"
                class="w-full px-3 py-2 rounded-lg bg-slate-50 border border-navy-100 text-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400"
              />
            </div>
            <div>
              <label class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Notes (optional)</label>
              <textarea
                v-model="addForm.notes"
                rows="3"
                :disabled="addSaving"
                class="w-full px-3 py-2 rounded-lg bg-slate-50 border border-navy-100 text-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 resize-none"
              ></textarea>
            </div>
            <div class="flex gap-3 justify-end pt-2">
              <button
                type="button"
                @click="addOpen = false"
                :disabled="addSaving"
                class="px-5 py-2.5 rounded-full border border-navy-200 text-navy-700 text-sm font-body font-semibold hover:bg-navy-50 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="addSaving"
                class="px-5 py-2.5 rounded-full bg-[#001B3D] text-white text-sm font-body font-semibold hover:bg-navy-800 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
              >
                {{ addSaving ? 'Saving…' : 'Add student' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Student detail modal. :duration guarantees the leave completes on a
         timer (see add-modal note) so the backdrop is always removed. -->
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
              <p class="font-body text-sm text-navy-500 mt-0.5 break-words">Parent: {{ detailRow.parentName }}</p>
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
                <!-- Editable: grade is admin-managed, so the detail view doubles
                     as the grade form for any student. -->
                <select
                  :value="detailRow.gradeLevel ?? ''"
                  :disabled="isSaving(detailRow.id)"
                  @change="(e) => setGrade(detailRow, e.target.value)"
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
              <dt class="font-body text-[10px] tracking-wider uppercase font-bold text-navy-500 mb-1">Phone</dt>
              <dd class="font-body text-sm text-navy-800">{{ formatPhone(detailRow.phoneNumber) }}</dd>
            </div>
            <div>
              <dt class="font-body text-[10px] tracking-wider uppercase font-bold text-navy-500 mb-1">Paid status</dt>
              <dd>
                <span
                  class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-body font-bold"
                  :class="detailRow.paid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-navy-50 text-navy-500 border border-navy-200'"
                >
                  {{ detailRow.paid ? 'Paid' : 'Not paid' }}
                </span>
              </dd>
            </div>
            <div v-if="showPaidFrom">
              <dt class="font-body text-[10px] tracking-wider uppercase font-bold text-navy-500 mb-1">Paid from</dt>
              <dd class="font-body text-sm text-navy-800">{{ detailRow.paidFrom ?? '—' }}</dd>
            </div>
            <div>
              <dt class="font-body text-[10px] tracking-wider uppercase font-bold text-navy-500 mb-1">Paid until</dt>
              <dd class="font-body text-sm text-navy-800">{{ detailRow.paidUntil ?? '—' }}</dd>
            </div>
          </dl>

          <div class="mb-6">
            <p class="font-body text-[10px] tracking-wider uppercase font-bold text-navy-500 mb-1.5">Notes</p>
            <p v-if="detailRow.notes" class="font-body text-sm text-navy-700 whitespace-pre-wrap leading-relaxed">{{ detailRow.notes }}</p>
            <p v-else class="font-body text-sm text-navy-300 italic">No notes yet.</p>
          </div>

          <!-- Homework — only on rosters with portal accounts (Students). -->
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
                <!-- Done toggle -->
                <button
                  type="button"
                  @click="toggleAssignmentDone(a)"
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
                    <p class="font-body text-sm font-semibold" :class="a.completed ? 'text-navy-400 line-through' : 'text-navy-900'">{{ a.title }}</p>
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
      message="This permanently deletes the row. You can re-add the student later if needed."
      confirm-label="Delete"
      danger
      @confirm="confirmDelete"
      @cancel="toDeleteId = null"
    />
  </main>
</template>
