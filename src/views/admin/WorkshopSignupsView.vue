<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAdminApi } from '../../composables/useAdminApi.js'
import PageHeader from '../../components/admin/PageHeader.vue'
import InlineNotes from '../../components/admin/InlineNotes.vue'
import ConfirmDialog from '../../components/admin/ConfirmDialog.vue'
import WorkshopSignupModal from '../../components/WorkshopSignupModal.vue'
import { WORKSHOPS, workshopPillClasses } from '../../constants/workshops.js'

const api = useAdminApi()

const signups = ref([])
const loading = ref(true)
const error = ref('')
const rowSaving = ref(new Set())

const sortBy = ref('newest') // 'newest' | 'parent'
const filter = ref('all') // 'all' | 'paid' | 'partial' | 'notPaid'
// Per-workshop slice. '' = all workshops; otherwise the exact workshop string.
// Pattern C from the design discussion: keep one row per family (one
// `workshops` array column), but let Anila slice the list down to a single
// workshop when she wants an attendance roster for, say, the Baking Workshop.
const workshopFilter = ref('')

const toDeleteId = ref(null)
const addModalOpen = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await api.get('/api/workshop-signups')
    signups.value = data.signups ?? []
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(load)

// "paid" / "partial" / "unpaid" derived from the row's two arrays. We compare
// paidWorkshops against the family's workshops (not against the global catalog)
// because a family who signed up for 2 workshops and paid for both is "fully
// paid" even though there are 9 other workshops they didn't sign up for.
function paidStatus(row) {
  const total = row.workshops?.length ?? 0
  if (total === 0) return 'unpaid'
  const paidCount = (row.paidWorkshops ?? []).filter((w) => row.workshops.includes(w)).length
  if (paidCount === 0) return 'unpaid'
  if (paidCount === total) return 'paid'
  return 'partial'
}

function paidCount(row) {
  return (row.paidWorkshops ?? []).filter((w) => row.workshops?.includes(w)).length
}

const filtered = computed(() => {
  let rows = signups.value
  if (filter.value !== 'all') {
    const want = filter.value === 'notPaid' ? 'unpaid' : filter.value
    rows = rows.filter((r) => paidStatus(r) === want)
  }

  // Workshop slice — include any row whose workshops array contains the
  // selected workshop. Multi-workshop families still appear here, just
  // alongside everyone else who picked the same workshop.
  if (workshopFilter.value) {
    rows = rows.filter((r) => r.workshops?.includes(workshopFilter.value))
  }

  const sorted = [...rows]
  if (sortBy.value === 'newest') {
    sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  } else if (sortBy.value === 'parent') {
    sorted.sort((a, b) => a.parentName.localeCompare(b.parentName))
  }
  return sorted
})

async function patch(row, patchBody) {
  rowSaving.value.add(row.id)
  // Optimistic update — apply the change in the UI immediately, roll back if the API rejects.
  const prev = { ...row, paidWorkshops: [...(row.paidWorkshops ?? [])] }
  Object.assign(row, patchBody)
  try {
    const data = await api.patch(`/api/workshop-signups/${row.id}`, patchBody)
    Object.assign(row, data.signup)
  } catch (err) {
    Object.assign(row, prev)
    error.value = err.message
  } finally {
    rowSaving.value.delete(row.id)
  }
}

// Toggle a single workshop's paid status for this family. Adds or removes
// the workshop from paidWorkshops, then PATCHes the row.
async function togglePaidWorkshop(row, workshop) {
  const current = new Set(row.paidWorkshops ?? [])
  if (current.has(workshop)) current.delete(workshop)
  else current.add(workshop)
  await patch(row, { paidWorkshops: Array.from(current) })
}

function isSaving(id) {
  return rowSaving.value.has(id)
}

function isPaidFor(row, workshop) {
  return (row.paidWorkshops ?? []).includes(workshop)
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function confirmDelete() {
  const id = toDeleteId.value
  if (!id) return
  toDeleteId.value = null
  try {
    await api.delete(`/api/workshop-signups/${id}`)
    signups.value = signups.value.filter((r) => r.id !== id)
  } catch (err) {
    error.value = err.message
  }
}

const filterChips = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'partial', label: 'Partial' },
  { key: 'notPaid', label: 'Not paid' },
]

const sortOptions = [
  { key: 'newest', label: 'Newest first' },
  { key: 'parent', label: 'Parent A–Z' },
]
</script>

<template>
  <main>
    <PageHeader
      eyebrow="List"
      title="Workshop Signups"
      :count="signups.length"
    >
      <template #actions>
        <button
          type="button"
          @click="addModalOpen = true"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#001B3D] text-white font-body text-sm font-bold tracking-wider uppercase hover:bg-navy-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add signup
        </button>
      </template>
    </PageHeader>

    <!-- Filters + sort -->
    <div class="px-6 md:px-10 py-5 border-b border-navy-100 bg-white flex flex-wrap items-center gap-3 justify-between">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="chip in filterChips"
            :key="chip.key"
            @click="filter = chip.key"
            class="px-3.5 py-1.5 rounded-full font-body text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
            :class="filter === chip.key
              ? 'bg-[#001B3D] text-white'
              : 'bg-navy-50 text-navy-600 hover:bg-navy-100'"
          >
            {{ chip.label }}
          </button>
        </div>
        <!-- Per-workshop filter. Empty value = no slice, show everyone. -->
        <div class="flex items-center gap-2">
          <label for="workshop-filter" class="font-body text-xs font-semibold text-navy-500 uppercase tracking-wider">Workshop</label>
          <select
            id="workshop-filter"
            v-model="workshopFilter"
            class="px-3 py-1.5 rounded-lg bg-navy-50 border border-navy-100 text-navy-700 font-body text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 max-w-[18rem]"
          >
            <option value="">All workshops</option>
            <option v-for="w in WORKSHOPS" :key="w" :value="w">{{ w }}</option>
          </select>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <label class="font-body text-xs font-semibold text-navy-500 uppercase tracking-wider">Sort</label>
        <select
          v-model="sortBy"
          class="px-3 py-1.5 rounded-lg bg-navy-50 border border-navy-100 text-navy-700 font-body text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400"
        >
          <option v-for="opt in sortOptions" :key="opt.key" :value="opt.key">{{ opt.label }}</option>
        </select>
      </div>
    </div>

    <div v-if="error" class="mx-6 md:mx-10 mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-body">
      {{ error }}
    </div>

    <div class="px-6 md:px-10 py-6">
      <div v-if="loading" class="py-16 text-center font-body text-sm text-navy-400">Loading…</div>
      <div v-else-if="filtered.length === 0" class="py-16 text-center">
        <p class="font-body text-sm text-navy-400">No signups match this filter yet.</p>
      </div>

      <div v-else class="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-navy-50/60">
              <tr>
                <th class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Parent</th>
                <th class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Student</th>
                <th class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Workshops <span class="font-normal normal-case tracking-normal text-navy-400">(click to toggle paid)</span></th>
                <th class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Status</th>
                <th class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Submitted</th>
                <th class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Notes (parent)</th>
                <th class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Notes (teacher)</th>
                <th class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-navy-100">
              <tr v-for="row in filtered" :key="row.id" class="align-top hover:bg-navy-50/40 transition-colors">
                <td class="px-4 py-4 font-body font-semibold text-navy-900">{{ row.parentName }}</td>
                <td class="px-4 py-4 font-body text-navy-700">{{ row.studentName }}</td>
                <td class="px-4 py-4">
                  <!-- Each workshop pill is a button. Color encodes WHICH workshop;
                       fill weight (light tinted vs solid) encodes paid state.
                       Click toggles paid for that one workshop. -->
                  <div class="flex flex-wrap gap-1.5 max-w-md">
                    <button
                      v-for="w in row.workshops"
                      :key="w"
                      type="button"
                      :disabled="isSaving(row.id)"
                      @click="togglePaidWorkshop(row, w)"
                      :class="[
                        workshopPillClasses(w, isPaidFor(row, w)),
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-body font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
                      ]"
                      :aria-pressed="isPaidFor(row, w)"
                      :aria-label="`${w} — ${isPaidFor(row, w) ? 'paid' : 'unpaid'}, click to toggle`"
                    >
                      <svg v-if="isPaidFor(row, w)" class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{{ w }}</span>
                    </button>
                  </div>
                </td>
                <td class="px-4 py-4">
                  <!-- Compact "X/Y paid" badge — quick scan of where each family stands. -->
                  <span
                    class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-body font-bold border whitespace-nowrap"
                    :class="paidStatus(row) === 'paid'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : paidStatus(row) === 'partial'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-navy-50 text-navy-500 border-navy-200'"
                  >
                    {{ paidCount(row) }} / {{ row.workshops?.length ?? 0 }} paid
                  </span>
                </td>
                <td class="px-4 py-4 font-body text-xs text-navy-500 whitespace-nowrap">{{ formatDate(row.createdAt) }}</td>
                <td class="px-4 py-4">
                  <p v-if="row.additionalNotes" class="font-body text-xs text-navy-600 max-w-xs whitespace-pre-wrap">{{ row.additionalNotes }}</p>
                  <p v-else class="font-body text-xs text-navy-300 italic">—</p>
                </td>
                <td class="px-4 py-4">
                  <InlineNotes
                    :model-value="row.notes"
                    :saving="isSaving(row.id)"
                    placeholder="Add a note for yourself…"
                    @save="(v) => patch(row, { notes: v })"
                  />
                </td>
                <td class="px-4 py-4 text-right">
                  <button
                    type="button"
                    @click="toDeleteId = row.id"
                    class="p-2 rounded-lg text-navy-400 hover:bg-red-50 hover:text-red-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 focus:outline-none"
                    aria-label="Delete signup"
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

    <ConfirmDialog
      :show="toDeleteId !== null"
      title="Delete this signup?"
      message="This will permanently remove the parent's submission. You can't undo this."
      confirm-label="Delete"
      danger
      @confirm="confirmDelete"
      @cancel="toDeleteId = null"
    />

    <!-- Manual add — same modal + form parents use on /enroll. Authenticated
         POSTs skip the public rate limiter and don't trigger the admin
         notification email (Anila wouldn't want to email herself). -->
    <WorkshopSignupModal v-model:open="addModalOpen" @submitted="load" />
  </main>
</template>
