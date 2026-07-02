<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAdminApi } from '../../composables/useAdminApi.js'
import { useModalA11y } from '../../composables/useModalA11y.js'
import { formatPhoneDisplay, formatPhoneInput } from '../../utils/phone.js'
import PageHeader from './PageHeader.vue'
import ToggleSwitch from './ToggleSwitch.vue'
import InlineNotes from './InlineNotes.vue'
import ConfirmDialog from './ConfirmDialog.vue'

// Roster for the one-time-payment programs (Summer Camp + STEM). Differs from
// the year-round Students roster on purpose:
//   - No grade grouping/tabs — one flat list.
//   - Families grouped into one card per parent, each child as its own row
//     with its OWN paid toggle (payment is per student).
//   - Payment is a single paid/unpaid switch — one-time fee, no dates.

const props = defineProps({
  endpoint: { type: String, required: true }, // /api/summer-camp | /api/stem-program
  title: { type: String, required: true },
  eyebrow: { type: String, required: true },
  subtitle: { type: String, default: '' },
  emptyMessage: { type: String, default: 'No students on this roster yet.' },
  // Archived rosters (a program that has ended) become a historical record:
  // no Add student, no paid tracking — just the names. Notes and delete stay
  // so a mistaken row can still be corrected.
  archived: { type: Boolean, default: false },
})

const api = useAdminApi()

const students = ref([])
const loading = ref(true)
const error = ref('')
const rowSaving = ref(new Set())
const toDeleteId = ref(null)

const addOpen = ref(false)
const addSaving = ref(false)
const addError = ref('')
const addForm = ref(emptyAddForm())

function emptyAddForm() {
  return { parentName: '', studentName: '', phoneNumber: '', notes: '' }
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

// One card per family. Students sharing a parent name (case-insensitive)
// group together; rows with no parent name each stand alone. Families sort
// alphabetically, children within a family too.
const families = computed(() => {
  const map = new Map()
  for (const s of students.value) {
    const key = s.parentName?.trim() ? `p:${s.parentName.trim().toLowerCase()}` : `solo:${s.id}`
    if (!map.has(key)) {
      map.set(key, { key, parentName: s.parentName?.trim() || null, phoneNumber: s.phoneNumber, kids: [] })
    }
    const fam = map.get(key)
    fam.kids.push(s)
    // Prefer any non-empty phone for the family header.
    if (!fam.phoneNumber && s.phoneNumber) fam.phoneNumber = s.phoneNumber
  }
  const list = [...map.values()]
  for (const f of list) f.kids.sort((a, b) => a.studentName.localeCompare(b.studentName))
  list.sort((a, b) => (a.parentName ?? a.kids[0].studentName).localeCompare(b.parentName ?? b.kids[0].studentName))
  return list
})

const paidCount = computed(() => students.value.filter((s) => s.paid).length)

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
  addForm.value = emptyAddForm()
  addOpen.value = true
}

function onAddPhoneInput(e) {
  addForm.value.phoneNumber = formatPhoneInput(e.target.value)
}

async function submitAdd() {
  addError.value = ''
  const { parentName, studentName, phoneNumber, notes } = addForm.value
  if (!parentName.trim() || !studentName.trim()) {
    addError.value = 'Parent and student names are required.'
    return
  }
  addSaving.value = true
  try {
    const data = await api.post(props.endpoint, {
      parentName: parentName.trim(),
      studentName: studentName.trim(),
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

const addPanel = ref(null)
useModalA11y(() => addOpen.value, addPanel, () => { addOpen.value = false })
</script>

<template>
  <main>
    <PageHeader :eyebrow="eyebrow" :title="title" :subtitle="subtitle" :count="students.length">
      <template #actions>
        <button
          v-if="!archived"
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

    <div class="px-6 md:px-10 py-8">
      <div v-if="loading" role="status" class="py-16 text-center font-body text-sm text-navy-400">Loading…</div>
      <div v-else-if="students.length === 0" class="py-16 text-center">
        <p class="font-body text-sm text-navy-400">{{ emptyMessage }}</p>
      </div>

      <template v-else>
        <p v-if="!archived" class="mb-5 font-body text-xs text-navy-400">{{ paidCount }} of {{ students.length }} paid</p>

        <!-- One card per family; each child has its own paid toggle. -->
        <ul class="space-y-4">
          <li
            v-for="fam in families"
            :key="fam.key"
            class="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden"
          >
            <div class="px-5 py-3.5 bg-navy-50/60 border-b border-navy-100 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p class="font-body text-sm font-bold text-navy-900 break-words">
                {{ fam.parentName ?? '— no parent listed —' }}
              </p>
              <p class="font-body text-xs text-navy-500 whitespace-nowrap">{{ formatPhoneDisplay(fam.phoneNumber) }}</p>
              <p v-if="fam.kids.length > 1" class="ml-auto font-body text-[11px] font-semibold text-academic-700 uppercase tracking-wider whitespace-nowrap">
                {{ fam.kids.length }} students
              </p>
            </div>
            <ul class="divide-y divide-navy-100">
              <li v-for="kid in fam.kids" :key="kid.id" class="px-5 py-3.5 flex flex-wrap items-center gap-3">
                <p class="font-body text-sm font-semibold text-navy-800 break-words min-w-0 flex-1 basis-40">{{ kid.studentName }}</p>
                <template v-if="!archived">
                  <span
                    class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-body font-bold border whitespace-nowrap"
                    :class="kid.paid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-navy-50 text-navy-500 border-navy-200'"
                  >
                    {{ kid.paid ? 'Paid' : 'Not paid' }}
                  </span>
                  <ToggleSwitch
                    :model-value="kid.paid"
                    :disabled="isSaving(kid.id)"
                    :label="`Mark ${kid.studentName} paid`"
                    @update:model-value="(v) => patch(kid, { paid: v })"
                  />
                </template>
                <div class="basis-full sm:basis-auto sm:flex-1 min-w-0">
                  <InlineNotes
                    :model-value="kid.notes"
                    :saving="isSaving(kid.id)"
                    placeholder="Add a note…"
                    @save="(v) => patch(kid, { notes: v })"
                  />
                </div>
                <button
                  type="button"
                  @click="toDeleteId = kid.id"
                  class="p-2 rounded-lg text-navy-400 hover:bg-red-50 hover:text-red-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 focus:outline-none"
                  :aria-label="`Delete ${kid.studentName}`"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </li>
            </ul>
          </li>
        </ul>
      </template>
    </div>

    <!-- Add student modal — parent + student + phone + notes. No grade (this
         roster doesn't categorize by grade) and no payment dates (one-time fee;
         use the paid toggle on the row after adding). -->
    <Transition
      :duration="{ enter: 150, leave: 100 }"
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in pointer-events-none"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="addOpen" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" @click.self="addOpen = false">
        <div ref="addPanel" role="dialog" aria-modal="true" aria-labelledby="camp-add-title" class="bg-white rounded-2xl shadow-2xl shadow-black/20 max-w-md w-full p-6 md:p-7">
          <h2 id="camp-add-title" class="font-heading text-xl font-bold text-[#001B3D] mb-4">Add student</h2>
          <div v-if="addError" role="alert" class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {{ addError }}
          </div>
          <form @submit.prevent="submitAdd" class="space-y-4">
            <div>
              <label for="camp-parent" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Parent name</label>
              <input
                id="camp-parent"
                v-model="addForm.parentName"
                type="text"
                required
                :disabled="addSaving"
                class="w-full px-3 py-2 rounded-lg bg-slate-50 border border-navy-100 text-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400"
              />
              <p class="mt-1 font-body text-[11px] text-navy-400">Use the exact same parent name for siblings — they'll group into one card.</p>
            </div>
            <div>
              <label for="camp-student" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Student name</label>
              <input
                id="camp-student"
                v-model="addForm.studentName"
                type="text"
                required
                :disabled="addSaving"
                class="w-full px-3 py-2 rounded-lg bg-slate-50 border border-navy-100 text-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400"
              />
            </div>
            <div>
              <label for="camp-phone" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Phone number</label>
              <input
                id="camp-phone"
                :value="addForm.phoneNumber"
                @input="onAddPhoneInput"
                type="tel"
                inputmode="tel"
                :disabled="addSaving"
                placeholder="(504) 373-9778"
                class="w-full px-3 py-2 rounded-lg bg-slate-50 border border-navy-100 text-navy-800 text-sm placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400"
              />
            </div>
            <div>
              <label for="camp-notes" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Notes (optional)</label>
              <textarea
                id="camp-notes"
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
