<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAdminApi } from '../../composables/useAdminApi.js'
import PageHeader from '../../components/admin/PageHeader.vue'

// Read-only record of payments across the sources the site tracks — workshop
// signups and the camp/STEM rosters. All payments are one-time (no billing
// windows), and tutoring payments aren't tracked on the site at all. Editing
// happens on the source-specific page; each row's "Open" link deep-links there.

const api = useAdminApi()

const rows = ref([])
const loading = ref(true)
const error = ref('')

const sourceFilter = ref('all') // 'all' | 'workshop' | 'summer_camp' | 'stem_program'
const statusFilter = ref('all') // 'all' | 'paid' | 'partial'

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

// Camp/STEM rows arrive only when paid. Workshop rows arrive once at least
// one workshop is paid — 'partial' until the family has paid for all of them.
function statusOf(row) {
  if (row.source === 'workshop') {
    return row.paid ? 'paid' : 'partial'
  }
  return 'paid'
}

const filtered = computed(() => {
  return rows.value.filter((r) => {
    if (sourceFilter.value !== 'all' && r.source !== sourceFilter.value) return false
    if (statusFilter.value !== 'all' && statusOf(r) !== statusFilter.value) return false
    return true
  })
})

const counts = computed(() => {
  const c = { all: rows.value.length, paid: 0, partial: 0 }
  for (const r of rows.value) c[statusOf(r)]++
  return c
})

const sourceLabels = {
  workshop: 'Workshop',
  summer_camp: 'Summer Camp',
  stem_program: 'STEM',
}

const sourceColors = {
  workshop: 'bg-violet-50 text-violet-700 border-violet-200',
  summer_camp: 'bg-amber-50 text-amber-700 border-amber-200',
  stem_program: 'bg-sky-50 text-sky-700 border-sky-200',
}

// Source -> the admin page that owns mutations for that record type.
const sourceRoutes = {
  workshop: '/admin/workshop-signups',
  summer_camp: '/admin/summer-camp',
  stem_program: '/admin/stem-program',
}

function statusBadge(row) {
  const base = 'inline-block px-2.5 py-0.5 rounded-full text-[11px] font-body font-bold border whitespace-nowrap'
  if (row.source === 'workshop') {
    const total = row.workshops?.length ?? 0
    const paid = (row.paidWorkshops ?? []).filter((w) => row.workshops?.includes(w)).length
    if (row.paid) return { class: `${base} bg-emerald-50 text-emerald-700 border-emerald-200`, label: `Paid ${paid}/${total}` }
    return { class: `${base} bg-amber-50 text-amber-800 border-amber-200`, label: `Partial ${paid}/${total}` }
  }
  return { class: `${base} bg-emerald-50 text-emerald-700 border-emerald-200`, label: 'Paid' }
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
]

// Only paid records appear here at all; "Partial" is the workshop family that
// has paid for some-but-not-all of their workshops.
const statusFilters = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid', tone: 'emerald' },
  { key: 'partial', label: 'Partial', tone: 'amber' },
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
                <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Student</th>
                <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Parent</th>
                <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Source</th>
                <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Status</th>
                <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">Last updated</th>
                <th scope="col" class="px-4 py-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500 text-right">Manage</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-navy-100">
              <tr
                v-for="row in filtered"
                :key="`${row.source}-${row.id}`"
                class="hover:bg-navy-50/40 transition-colors"
              >
                <td class="px-4 py-4 font-body font-semibold text-navy-900 break-words">{{ row.studentName || row.parentName }}</td>
                <td class="px-4 py-4 font-body text-navy-700 break-words">{{ row.parentName }}</td>
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
                  <!-- Real link, keyboard-reachable. Deep-links to the source
                       page that owns this record's edits. -->
                  <router-link
                    :to="sourceRoutes[row.source]"
                    class="inline-flex items-center gap-1 font-body text-xs text-academic-700 font-semibold hover:text-academic-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none rounded"
                    :aria-label="`Manage ${row.studentName || row.parentName} in ${sourceLabels[row.source]}`"
                  >
                    Open
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p class="mt-4 font-body text-xs text-navy-400">
        Read-only view of payments received. To mark someone paid or unpaid, use the row's Open link to manage them on their program page.
      </p>
    </div>
  </main>
</template>
