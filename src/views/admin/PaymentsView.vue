<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminApi } from '../../composables/useAdminApi.js'
import PageHeader from '../../components/admin/PageHeader.vue'

// Read-only consolidated view of paid status across every billable source — workshop
// signups, summer camp, STEM program, regular tutoring. The point of this page is to
// give Mrs. Anila a single screen to see who's about to lapse without bouncing through
// four roster tabs. Editing still happens on the source-specific page; clicking a row
// here deep-links there.

const api = useAdminApi()
const router = useRouter()

const rows = ref([])
const loading = ref(true)
const error = ref('')

const sourceFilter = ref('all') // 'all' | 'workshop' | 'summer_camp' | 'stem_program' | 'regular'
const statusFilter = ref('all') // 'all' | 'active' | 'expiring' | 'expired' | 'partial' | 'unpaid'

// Today, as a yyyy-mm-dd string in local time. Postgres date columns are bare-day so we
// compare string-to-string against paid_until to keep the math timezone-agnostic.
const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

const sevenDaysOut = new Date(today)
sevenDaysOut.setDate(today.getDate() + 7)
const sevenDaysOutStr = `${sevenDaysOut.getFullYear()}-${String(sevenDaysOut.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysOut.getDate()).padStart(2, '0')}`

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await api.get('/api/payments')
    rows.value = data.payments ?? []
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(load)

// Status categorization — used for the color pill AND the filter dropdown.
// Workshop rows carry workshops + paidWorkshops arrays (per-workshop payment).
// Student rows carry paid + paidUntil (windowed billing).
function statusOf(row) {
  // Workshop rows: derive from the two arrays. Partial = some workshops paid
  // but not all; unpaid = none paid; active = every signed-up workshop paid.
  if (row.source === 'workshop') {
    const total = row.workshops?.length ?? 0
    const paid = (row.paidWorkshops ?? []).filter((w) => row.workshops?.includes(w)).length
    if (total === 0 || paid === 0) return 'unpaid'
    if (paid === total) return 'active'
    return 'partial'
  }
  // Student rows: original windowed-billing logic.
  if (!row.paid) return 'unpaid'
  if (!row.paidUntil) return 'active' // paid=true but no expiry = treat as active
  if (row.paidUntil < todayStr) return 'expired'
  if (row.paidUntil <= sevenDaysOutStr) return 'expiring'
  return 'active'
}

const filtered = computed(() => {
  return rows.value.filter((r) => {
    if (sourceFilter.value !== 'all' && r.source !== sourceFilter.value) return false
    if (statusFilter.value !== 'all' && statusOf(r) !== statusFilter.value) return false
    return true
  })
})

const counts = computed(() => {
  const c = { all: rows.value.length, active: 0, expiring: 0, expired: 0, partial: 0, unpaid: 0 }
  for (const r of rows.value) c[statusOf(r)]++
  return c
})

const sourceLabels = {
  workshop: 'Workshop',
  summer_camp: 'Summer Camp',
  stem_program: 'STEM',
  regular: 'Tutoring',
}

const sourceColors = {
  workshop: 'bg-violet-50 text-violet-700 border-violet-200',
  summer_camp: 'bg-amber-50 text-amber-700 border-amber-200',
  stem_program: 'bg-sky-50 text-sky-700 border-sky-200',
  regular: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

// Source -> the admin page that owns mutations for that record type.
const sourceRoutes = {
  workshop: '/admin/workshop-signups',
  summer_camp: '/admin/summer-camp',
  stem_program: '/admin/stem-program',
  regular: '/admin/students',
}

function statusBadge(row) {
  const s = statusOf(row)
  const base = 'inline-block px-2.5 py-0.5 rounded-full text-[11px] font-body font-bold border whitespace-nowrap'
  // Workshop rows get fractional labels ("Paid 2/3") because payment is per
  // workshop, not per billing window.
  if (row.source === 'workshop') {
    const total = row.workshops?.length ?? 0
    const paid = (row.paidWorkshops ?? []).filter((w) => row.workshops?.includes(w)).length
    if (s === 'active') return { class: `${base} bg-emerald-50 text-emerald-700 border-emerald-200`, label: `Paid ${paid}/${total}` }
    if (s === 'partial') return { class: `${base} bg-amber-50 text-amber-800 border-amber-200`, label: `Partial ${paid}/${total}` }
    return { class: `${base} bg-navy-50 text-navy-500 border-navy-200`, label: `Not paid 0/${total}` }
  }
  // Student rows: windowed billing labels.
  if (s === 'active') return { class: `${base} bg-emerald-50 text-emerald-700 border-emerald-200`, label: row.paidUntil ? `Paid · until ${row.paidUntil}` : 'Paid' }
  if (s === 'expiring') return { class: `${base} bg-amber-50 text-amber-800 border-amber-200`, label: `Expires ${row.paidUntil}` }
  if (s === 'expired') return { class: `${base} bg-red-50 text-red-700 border-red-200`, label: `Expired ${row.paidUntil}` }
  return { class: `${base} bg-navy-50 text-navy-500 border-navy-200`, label: 'Not paid' }
}

function goToSource(row) {
  // Mutations live on the source page. Deep-link the admin there so they can act on
  // this exact record. No pre-selection yet — that's a follow-up if Anila asks for it.
  router.push(sourceRoutes[row.source])
}

function formatUpdated(value) {
  if (!value) return '—'
  const d = new Date(value)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const sourceFilters = [
  { key: 'all', label: 'All sources' },
  { key: 'workshop', label: 'Workshop' },
  { key: 'summer_camp', label: 'Summer Camp' },
  { key: 'stem_program', label: 'STEM' },
  { key: 'regular', label: 'Tutoring' },
]

const statusFilters = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active', tone: 'emerald' },
  { key: 'expiring', label: 'Expiring soon', tone: 'amber' },
  { key: 'partial', label: 'Partial', tone: 'amber' },
  { key: 'expired', label: 'Expired', tone: 'red' },
  { key: 'unpaid', label: 'Unpaid', tone: 'navy' },
]
</script>

<template>
  <main>
    <PageHeader
      eyebrow="Overview"
      title="Payments"
      :count="rows.length"
    />

    <!-- Filters -->
    <div class="px-6 md:px-10 py-5 border-b border-navy-100 bg-white space-y-3">
      <div class="flex flex-wrap items-center gap-3">
        <label class="font-body text-xs font-semibold text-navy-500 uppercase tracking-wider">Source</label>
        <select
          v-model="sourceFilter"
          class="px-3 py-1.5 rounded-lg bg-navy-50 border border-navy-100 text-navy-700 font-body text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400"
        >
          <option v-for="opt in sourceFilters" :key="opt.key" :value="opt.key">{{ opt.label }}</option>
        </select>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="chip in statusFilters"
          :key="chip.key"
          @click="statusFilter = chip.key"
          class="px-3.5 py-1.5 rounded-full font-body text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none border"
          :class="statusFilter === chip.key
            ? 'bg-[#001B3D] text-white border-[#001B3D]'
            : 'bg-white text-navy-600 border-navy-200 hover:bg-navy-50'"
        >
          {{ chip.label }}
          <span class="ml-1 opacity-70">{{ counts[chip.key] }}</span>
        </button>
      </div>
    </div>

    <div v-if="error" class="mx-6 md:mx-10 mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-body">
      {{ error }}
    </div>

    <div class="px-6 md:px-10 py-6">
      <div v-if="loading" class="py-16 text-center font-body text-sm text-navy-400">Loading…</div>
      <div v-else-if="filtered.length === 0" class="py-16 text-center">
        <p class="font-body text-sm text-navy-400">No records match this filter.</p>
      </div>

      <div v-else class="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-navy-50/60">
              <tr>
                <th class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Student</th>
                <th class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Parent</th>
                <th class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Source</th>
                <th class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Status</th>
                <th class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Last updated</th>
                <th class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500 text-right">Manage</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-navy-100">
              <tr
                v-for="row in filtered"
                :key="`${row.source}-${row.id}`"
                class="hover:bg-navy-50/40 transition-colors cursor-pointer"
                @click="goToSource(row)"
              >
                <td class="px-4 py-4 font-body font-semibold text-navy-900">{{ row.studentName }}</td>
                <td class="px-4 py-4 font-body text-navy-700">{{ row.parentName }}</td>
                <td class="px-4 py-4">
                  <span class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-body font-bold border" :class="sourceColors[row.source]">
                    {{ sourceLabels[row.source] }}
                  </span>
                </td>
                <td class="px-4 py-4">
                  <span :class="statusBadge(row).class">{{ statusBadge(row).label }}</span>
                </td>
                <td class="px-4 py-4 font-body text-xs text-navy-500 whitespace-nowrap">{{ formatUpdated(row.updatedAt) }}</td>
                <td class="px-4 py-4 text-right">
                  <span class="inline-flex items-center gap-1 font-body text-xs text-academic-700 font-semibold">
                    Open
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p class="mt-4 font-body text-xs text-navy-400">
        Read-only view. To mark someone paid or change dates, click a row to open the source page.
      </p>
    </div>
  </main>
</template>
