<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useStudentAuth } from '../composables/useStudentAuth.js'

// Logged-in student view. Shows who they are, their approval status, and
// their homework: each assignment lists title / details / due date, with a
// checkbox to mark it done (PATCH bound to their own session server-side).
// Re-fetches on mount so admin-side changes show up without re-login.

const router = useRouter()
const { t } = useI18n()
const { student, fetchSession, logout } = useStudentAuth()

const loading = ref(true)
const assignments = ref([])
const assignmentsError = ref('')

onMounted(async () => {
  await fetchSession()
  if (student.value) {
    try {
      const res = await fetch('/api/student-auth/assignments', { credentials: 'same-origin' })
      if (res.ok) {
        assignments.value = (await res.json()).assignments ?? []
      } else {
        assignmentsError.value = t('portal.assignmentsError')
      }
    } catch (_err) {
      assignmentsError.value = t('portal.assignmentsError')
    }
  }
  loading.value = false
})

const approved = computed(() => !!student.value?.approved)
const openCount = computed(() => assignments.value.filter((a) => !a.completed).length)

async function toggleDone(a) {
  const prev = a.completed
  a.completed = !prev
  try {
    const res = await fetch(`/api/student-auth/assignments/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ completed: a.completed }),
    })
    if (!res.ok) throw new Error()
    const data = await res.json()
    Object.assign(a, data.assignment)
  } catch (_err) {
    a.completed = prev
    assignmentsError.value = t('portal.assignmentsError')
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

function dueInfo(a) {
  if (!a.dueDate) return null
  const days = daysUntil(a.dueDate)
  const base = 'inline-block px-2 py-0.5 rounded-full text-[10px] font-body font-bold border whitespace-nowrap'
  if (a.completed) return { class: `${base} bg-navy-50 text-navy-400 border-navy-200`, label: t('portal.dueOn', { date: a.dueDate }) }
  if (days < 0) return { class: `${base} bg-red-50 text-red-700 border-red-200`, label: t('portal.overdue', { date: a.dueDate }) }
  if (days === 0) return { class: `${base} bg-amber-50 text-amber-800 border-amber-200`, label: t('portal.dueToday') }
  return { class: `${base} bg-academic-50 text-academic-700 border-academic-200`, label: t('portal.dueOn', { date: a.dueDate }) }
}

async function handleLogout() {
  await logout()
  router.push({ name: 'StudentLogin' })
}
</script>

<template>
  <main class="min-h-screen bg-gradient-to-b from-slate-50 to-white">
    <header class="bg-[#001B3D] px-6 md:px-10 py-4 flex items-center justify-between">
      <router-link to="/" class="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none rounded">
        <img src="/logo.png" alt="SAHA Institute — home" class="h-8 w-auto brightness-0 invert opacity-95" width="464" height="114" />
      </router-link>
      <button
        type="button"
        @click="handleLogout"
        class="font-body text-sm font-semibold text-white/80 hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
      >
        {{ t('portal.logout') }}
      </button>
    </header>

    <div class="max-w-3xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <div v-if="loading" class="py-16 text-center font-body text-sm text-navy-400">{{ t('portal.loading') }}</div>

      <template v-else-if="student">
        <p class="font-body text-[11px] tracking-[0.28em] uppercase text-academic-600 font-bold mb-2">{{ t('portal.eyebrow') }}</p>
        <h1 class="font-heading text-3xl md:text-4xl font-extrabold text-navy-900 tracking-tight mb-1">
          {{ t('portal.greeting', { name: student.name }) }}
        </h1>
        <p class="font-body text-navy-500 mb-10">@{{ student.username }}</p>

        <!-- Approval status -->
        <div
          class="rounded-2xl border p-6 md:p-7 mb-6"
          :class="approved ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-900'"
        >
          <p class="font-body text-[10px] tracking-[0.2em] uppercase font-bold opacity-70 mb-1">{{ t('portal.statusLabel') }}</p>
          <h2 class="font-heading text-xl font-bold mb-1">
            {{ approved ? t('portal.approvedHeading') : t('portal.pendingHeading') }}
          </h2>
          <p class="font-body text-sm leading-relaxed">
            {{ approved ? t('portal.approvedDetail') : t('portal.pendingDetail') }}
          </p>
        </div>

        <!-- Assignments -->
        <div class="bg-white rounded-2xl border border-navy-100 shadow-sm p-6 md:p-7">
          <div class="flex items-baseline justify-between gap-3 mb-4">
            <h2 class="font-heading text-lg font-bold text-navy-900">{{ t('portal.assignmentsHeading') }}</h2>
            <span v-if="assignments.length" class="font-body text-xs text-navy-400">
              {{ t('portal.assignmentsOpenCount', { open: openCount, total: assignments.length }) }}
            </span>
          </div>

          <div v-if="assignmentsError" class="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-body">
            {{ assignmentsError }}
          </div>

          <p v-if="assignments.length === 0" class="font-body text-sm text-navy-400">{{ t('portal.assignmentsEmpty') }}</p>

          <ul v-else class="space-y-3">
            <li
              v-for="a in assignments"
              :key="a.id"
              class="flex items-start gap-3 p-4 rounded-xl border transition-colors"
              :class="a.completed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-navy-100'"
            >
              <button
                type="button"
                @click="toggleDone(a)"
                :aria-label="a.completed ? t('portal.markNotDone') : t('portal.markDone')"
                class="mt-0.5 w-6 h-6 shrink-0 rounded-md border flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
                :class="a.completed ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-navy-300 hover:border-academic-400'"
              >
                <svg v-if="a.completed" class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-body text-sm font-semibold" :class="a.completed ? 'text-navy-400 line-through' : 'text-navy-900'">{{ a.title }}</p>
                  <span v-if="dueInfo(a)" :class="dueInfo(a).class">{{ dueInfo(a).label }}</span>
                </div>
                <p v-if="a.details" class="font-body text-sm text-navy-600 mt-1 whitespace-pre-wrap leading-relaxed">{{ a.details }}</p>
              </div>
            </li>
          </ul>
        </div>
      </template>
    </div>
  </main>
</template>
