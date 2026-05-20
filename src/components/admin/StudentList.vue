<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAdminApi } from '../../composables/useAdminApi.js'
import PageHeader from './PageHeader.vue'
import GradePill from './GradePill.vue'
import ToggleSwitch from './ToggleSwitch.vue'
import InlineNotes from './InlineNotes.vue'
import ConfirmDialog from './ConfirmDialog.vue'

// Shared list/CRUD UI for both Summer Camp and STEM Program. The two pages differ only
// in copy, the underlying API path, and an enrolled-grade default — so we drive both
// from one component and pass program-specific config in via props.

const props = defineProps({
  endpoint: { type: String, required: true }, // /api/summer-camp or /api/stem-program
  title: { type: String, required: true },
  eyebrow: { type: String, required: true },
  subtitle: { type: String, required: true },
  emptyMessage: { type: String, default: 'No students enrolled yet.' },
})

const api = useAdminApi()

const students = ref([])
const loading = ref(true)
const error = ref('')
const rowSaving = ref(new Set())

const toDeleteId = ref(null)
const addOpen = ref(false)
const addSaving = ref(false)
const addForm = ref({
  parentName: '',
  studentName: '',
  gradeLevel: 'elementary',
  notes: '',
})
const addError = ref('')

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

// Group students by grade level for visual headers in the table.
const grouped = computed(() => {
  const groups = { elementary: [], middle: [], high: [] }
  for (const s of students.value) {
    if (groups[s.gradeLevel]) groups[s.gradeLevel].push(s)
  }
  // Sort each group alphabetically by student name.
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => a.studentName.localeCompare(b.studentName))
  }
  return groups
})

const gradeLabels = {
  elementary: 'Elementary',
  middle: 'Middle School',
  high: 'High School',
}

async function patch(row, patchBody) {
  rowSaving.value.add(row.id)
  const prev = { ...row }
  Object.assign(row, patchBody)
  try {
    const data = await api.patch(`${props.endpoint}/${row.id}`, patchBody)
    Object.assign(row, data.student)
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

async function confirmDelete() {
  const id = toDeleteId.value
  if (!id) return
  toDeleteId.value = null
  try {
    await api.delete(`${props.endpoint}/${id}`)
    students.value = students.value.filter((s) => s.id !== id)
  } catch (err) {
    error.value = err.message
  }
}

function openAdd() {
  addError.value = ''
  addForm.value = { parentName: '', studentName: '', gradeLevel: 'elementary', notes: '' }
  addOpen.value = true
}

async function submitAdd() {
  addError.value = ''
  const { parentName, studentName, gradeLevel, notes } = addForm.value
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
</script>

<template>
  <main>
    <PageHeader :eyebrow="eyebrow" :title="title" :subtitle="subtitle" :count="students.length">
      <template #actions>
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

    <div v-if="error" class="mx-6 md:mx-10 mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-body">
      {{ error }}
    </div>

    <div class="px-6 md:px-10 py-8 space-y-10">
      <div v-if="loading" class="py-16 text-center font-body text-sm text-navy-400">Loading…</div>
      <div v-else-if="students.length === 0" class="py-16 text-center">
        <p class="font-body text-sm text-navy-400">{{ emptyMessage }}</p>
      </div>

      <template v-else>
        <section v-for="grade in ['elementary', 'middle', 'high']" :key="grade">
          <div v-if="grouped[grade].length > 0">
            <div class="flex items-center gap-3 mb-3">
              <h2 class="font-heading text-lg font-bold text-[#001B3D] tracking-tight">{{ gradeLabels[grade] }}</h2>
              <GradePill :grade="grade" size="sm" />
              <span class="font-body text-xs text-navy-400">{{ grouped[grade].length }}</span>
            </div>
            <div class="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead class="bg-navy-50/60">
                    <tr>
                      <th class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Parent</th>
                      <th class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Student</th>
                      <th class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Paid</th>
                      <th class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Paid until</th>
                      <th class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Notes</th>
                      <th class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-navy-100">
                    <tr v-for="row in grouped[grade]" :key="row.id" class="align-top hover:bg-navy-50/40 transition-colors">
                      <td class="px-4 py-4 font-body font-semibold text-navy-900">{{ row.parentName }}</td>
                      <td class="px-4 py-4 font-body text-navy-700">{{ row.studentName }}</td>
                      <td class="px-4 py-4">
                        <ToggleSwitch
                          :model-value="row.paid"
                          :disabled="isSaving(row.id)"
                          label="Mark paid"
                          @update:model-value="(v) => patch(row, { paid: v })"
                        />
                      </td>
                      <td class="px-4 py-4">
                        <input
                          type="date"
                          :value="row.paidUntil ?? ''"
                          :disabled="!row.paid || isSaving(row.id)"
                          @change="(e) => patch(row, { paidUntil: e.target.value || null })"
                          class="px-2 py-1 rounded-lg bg-navy-50 border border-navy-100 text-navy-700 text-xs font-body focus:outline-none focus:ring-2 focus:ring-academic-400/40 disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td class="px-4 py-4">
                        <InlineNotes
                          :model-value="row.notes"
                          :saving="isSaving(row.id)"
                          placeholder="Add a note…"
                          @save="(v) => patch(row, { notes: v })"
                        />
                      </td>
                      <td class="px-4 py-4 text-right">
                        <button
                          type="button"
                          @click="toDeleteId = row.id"
                          class="p-2 rounded-lg text-navy-400 hover:bg-red-50 hover:text-red-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 focus:outline-none"
                          aria-label="Delete student"
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
    </div>

    <!-- Add student modal -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="addOpen" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" @click.self="addOpen = false">
        <div role="dialog" aria-modal="true" class="bg-white rounded-2xl shadow-2xl shadow-black/20 max-w-md w-full p-6 md:p-7">
          <h2 class="font-heading text-xl font-bold text-[#001B3D] mb-4">Add student</h2>
          <div v-if="addError" class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
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
