<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useStudentAuth } from '../composables/useStudentAuth.js'

// Logged-in student view. Shows who they are, their approval status, and an
// Assignments section that's a placeholder for now (the assigned-work feature
// is the next build). Re-fetches on mount so approval / payment changes the
// admin made show up without re-login.

const router = useRouter()
const { t } = useI18n()
const { student, fetchSession, logout } = useStudentAuth()

const loading = ref(true)

onMounted(async () => {
  await fetchSession()
  loading.value = false
})

const approved = computed(() => !!student.value?.approved)

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

        <!-- Assignments — placeholder until the assigned-work feature ships. -->
        <div class="bg-white rounded-2xl border border-navy-100 shadow-sm p-6 md:p-7">
          <h2 class="font-heading text-lg font-bold text-navy-900 mb-1">{{ t('portal.assignmentsHeading') }}</h2>
          <p class="font-body text-sm text-navy-400">{{ t('portal.assignmentsEmpty') }}</p>
        </div>
      </template>
    </div>
  </main>
</template>
