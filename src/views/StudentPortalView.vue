<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useStudentAuth } from '../composables/useStudentAuth.js'

// Minimal logged-in student view: who they are + where their payment stands.
// Read-only for now (self-service edits / assignments are future work). The
// payment status mirrors the admin Students "billing status" badge so a student
// sees the same picture Anila does.

const router = useRouter()
const { t } = useI18n()
const { student, fetchSession, logout } = useStudentAuth()

const loading = ref(true)

onMounted(async () => {
  // Re-fetch fresh on mount so any payment change the admin made shows up.
  await fetchSession()
  loading.value = false
})

const gradeLabels = {
  elementary: 'Elementary',
  middle: 'Middle School',
  high: 'High School',
}

function daysUntil(yyyyMmDd) {
  if (!yyyyMmDd) return null
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  const t0 = new Date()
  const target = new Date(y, m - 1, d)
  const today = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate())
  return Math.round((target - today) / 86400000)
}

// Returns { tone, heading, detail } describing payment state in parent-friendly
// language (no jargon — this is the family's view, not the admin's).
const payment = computed(() => {
  const s = student.value
  if (!s || !s.paid) {
    return { tone: 'pending', heading: t('portal.payPendingHeading'), detail: t('portal.payPendingDetail') }
  }
  const days = daysUntil(s.paidUntil)
  if (days === null) {
    return { tone: 'active', heading: t('portal.payActiveHeading'), detail: t('portal.payNoDateDetail') }
  }
  if (days < 0) {
    return { tone: 'expired', heading: t('portal.payExpiredHeading'), detail: t('portal.payExpiredDetail', { date: s.paidUntil }) }
  }
  if (days <= 14) {
    return { tone: 'warning', heading: t('portal.payExpiringHeading'), detail: t('portal.payExpiringDetail', { days, date: s.paidUntil }) }
  }
  return { tone: 'active', heading: t('portal.payActiveHeading'), detail: t('portal.payActiveDetail', { date: s.paidUntil }) }
})

const toneClass = computed(() => ({
  active: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  expired: 'bg-red-50 border-red-200 text-red-800',
  pending: 'bg-navy-50 border-navy-200 text-navy-700',
})[payment.value.tone])

async function handleLogout() {
  await logout()
  router.push({ name: 'StudentLogin' })
}
</script>

<template>
  <main class="min-h-screen bg-gradient-to-b from-slate-50 to-white">
    <!-- Slim top bar -->
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
        <p class="font-body text-navy-500 mb-10">{{ student.email }}</p>

        <!-- Payment status card -->
        <div class="rounded-2xl border p-6 md:p-7 mb-6" :class="toneClass">
          <p class="font-body text-[10px] tracking-[0.2em] uppercase font-bold opacity-70 mb-1">{{ t('portal.paymentLabel') }}</p>
          <h2 class="font-heading text-xl font-bold mb-1">{{ payment.heading }}</h2>
          <p class="font-body text-sm leading-relaxed">{{ payment.detail }}</p>
        </div>

        <!-- Enrollment details -->
        <div class="bg-white rounded-2xl border border-navy-100 shadow-sm p-6 md:p-7">
          <dl class="grid grid-cols-2 gap-5">
            <div>
              <dt class="font-body text-[10px] tracking-wider uppercase font-bold text-navy-500 mb-1">{{ t('portal.gradeLabel') }}</dt>
              <dd class="font-body text-sm text-navy-800">{{ student.gradeLevel ? gradeLabels[student.gradeLevel] : t('portal.gradeUnset') }}</dd>
            </div>
            <div>
              <dt class="font-body text-[10px] tracking-wider uppercase font-bold text-navy-500 mb-1">{{ t('portal.statusLabel') }}</dt>
              <dd class="font-body text-sm text-navy-800">{{ student.paid ? t('portal.statusEnrolled') : t('portal.statusPending') }}</dd>
            </div>
          </dl>
          <p class="mt-6 pt-5 border-t border-navy-100 font-body text-xs text-navy-400 leading-relaxed">
            {{ t('portal.footnote') }}
          </p>
        </div>
      </template>
    </div>
  </main>
</template>
