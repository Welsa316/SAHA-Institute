<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useStudentAuth } from '../composables/useStudentAuth.js'

// One component drives both /register and /login. Mode comes from the route
// name so each URL is clean + shareable; a link toggles between them. On
// success, redirect to ?next or the portal.

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { register, login } = useStudentAuth()

const mode = computed(() => (route.name === 'StudentRegister' ? 'register' : 'login'))

const form = ref({ name: '', username: '', password: '' })
const submitting = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  if (mode.value === 'register' && form.value.name.trim().length < 2) {
    error.value = t('studentAuth.errors.nameRequired')
    return
  }
  submitting.value = true
  try {
    if (mode.value === 'register') {
      await register({
        name: form.value.name.trim(),
        username: form.value.username.trim(),
        password: form.value.password,
      })
    } else {
      await login({ username: form.value.username.trim(), password: form.value.password })
    }
    const next = typeof route.query.next === 'string' ? route.query.next : '/portal'
    router.push(next)
  } catch (err) {
    error.value = err?.message || t('studentAuth.errors.generic')
  } finally {
    submitting.value = false
  }
}

const toggleTarget = computed(() => ({
  name: mode.value === 'register' ? 'StudentLogin' : 'StudentRegister',
  query: route.query.next ? { next: route.query.next } : {},
}))
</script>

<template>
  <main class="min-h-screen bg-[#001B3D] flex items-center justify-center px-6 py-20 relative overflow-hidden">
    <div class="absolute inset-0" style="background: radial-gradient(ellipse 70% 50% at 50% 30%, rgba(100,160,255,0.18) 0%, transparent 70%);"></div>

    <div class="relative w-full max-w-md">
      <router-link to="/" class="flex justify-center mb-8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none rounded-lg">
        <img src="/logo.png" alt="SAHA Institute — home" class="h-12 w-auto brightness-0 invert opacity-95" width="464" height="114" />
      </router-link>

      <div class="bg-white rounded-3xl shadow-2xl shadow-black/30 p-8 md:p-10">
        <h1 class="font-heading text-2xl md:text-3xl font-extrabold text-navy-900 tracking-tight mb-1">
          {{ mode === 'register' ? t('studentAuth.registerHeading') : t('studentAuth.loginHeading') }}
        </h1>
        <p class="font-body text-sm text-navy-500 mb-7">
          {{ mode === 'register' ? t('studentAuth.registerSubtitle') : t('studentAuth.loginSubtitle') }}
        </p>

        <div v-if="error" class="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200">
          <p class="font-body text-sm text-red-600">{{ error }}</p>
        </div>

        <form @submit.prevent="onSubmit" class="space-y-4">
          <div v-if="mode === 'register'">
            <label for="sa-name" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">
              {{ t('studentAuth.nameLabel') }}
            </label>
            <input
              id="sa-name"
              v-model="form.name"
              type="text"
              autocomplete="name"
              required
              :disabled="submitting"
              :placeholder="t('studentAuth.namePlaceholder')"
              class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-navy-100 text-navy-800 font-body text-sm placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 transition-all duration-300 disabled:opacity-50"
            />
          </div>

          <div>
            <label for="sa-username" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">
              {{ t('studentAuth.usernameLabel') }}
            </label>
            <input
              id="sa-username"
              v-model="form.username"
              type="text"
              autocomplete="username"
              autocapitalize="none"
              spellcheck="false"
              required
              :disabled="submitting"
              :placeholder="t('studentAuth.usernamePlaceholder')"
              class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-navy-100 text-navy-800 font-body text-sm placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 transition-all duration-300 disabled:opacity-50"
            />
          </div>

          <div>
            <label for="sa-password" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">
              {{ t('studentAuth.passwordLabel') }}
            </label>
            <input
              id="sa-password"
              v-model="form.password"
              type="password"
              :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
              required
              :minlength="mode === 'register' ? 6 : undefined"
              :disabled="submitting"
              :placeholder="mode === 'register' ? t('studentAuth.passwordHintRegister') : t('studentAuth.passwordPlaceholder')"
              class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-navy-100 text-navy-800 font-body text-sm placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 transition-all duration-300 disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            :disabled="submitting"
            class="w-full inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#001B3D] text-white font-body text-sm font-bold tracking-[0.15em] uppercase hover:bg-navy-800 transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
          >
            <svg v-if="submitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {{ submitting
              ? t('studentAuth.submitting')
              : (mode === 'register' ? t('studentAuth.registerSubmit') : t('studentAuth.loginSubmit')) }}
          </button>
        </form>

        <p class="mt-6 text-center font-body text-sm text-navy-500">
          {{ mode === 'register' ? t('studentAuth.haveAccount') : t('studentAuth.noAccount') }}
          <router-link
            :to="toggleTarget"
            class="font-semibold text-academic-700 hover:text-academic-800 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none rounded"
          >
            {{ mode === 'register' ? t('studentAuth.loginLink') : t('studentAuth.registerLink') }}
          </router-link>
        </p>
      </div>
    </div>
  </main>
</template>
