<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useStudentAuth } from '../composables/useStudentAuth.js'
import { formatPhoneInput } from '../utils/phone.js'

// One component drives both /register and /login. Registration creates ONE
// family account: a parent registers one or more students (the "more than
// one student?" checkbox reveals extra name fields) under a single parent
// email + password. The portal then shows every student's homework side by
// side. Login is parent email + password.

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { register, login } = useStudentAuth()

const mode = computed(() => (route.name === 'StudentRegister' ? 'register' : 'login'))

const form = ref({ names: [''], email: '', phone: '', password: '' })
const multipleStudents = ref(false)
const submitting = ref(false)
const error = ref('')

const MAX_STUDENTS = 6

function onMultipleToggle(e) {
  multipleStudents.value = e.target.checked
  if (multipleStudents.value && form.value.names.length === 1) {
    form.value.names.push('')
  } else if (!multipleStudents.value) {
    // Back to a single student — keep the first name only.
    form.value.names = [form.value.names[0] ?? '']
  }
}

function addName() {
  if (form.value.names.length < MAX_STUDENTS) form.value.names.push('')
}

function removeName(i) {
  form.value.names.splice(i, 1)
  if (form.value.names.length === 1) multipleStudents.value = false
}

function onPhoneInput(e) {
  // Live-format as the parent types: digits in, "(504) 373-9778" out.
  form.value.phone = formatPhoneInput(e.target.value)
}

async function onSubmit() {
  error.value = ''
  if (mode.value === 'register') {
    const names = form.value.names.map((n) => n.trim()).filter((n) => n.length > 0)
    if (names.length === 0 || names.some((n) => n.length < 2)) {
      error.value = t('studentAuth.errors.nameRequired')
      return
    }
    if (form.value.phone.replace(/\D/g, '').length < 10) {
      error.value = t('studentAuth.errors.phoneRequired')
      return
    }
  }
  submitting.value = true
  try {
    if (mode.value === 'register') {
      await register({
        names: form.value.names.map((n) => n.trim()).filter((n) => n.length > 0),
        parentEmail: form.value.email.trim(),
        parentPhone: form.value.phone,
        password: form.value.password,
      })
    } else {
      await login({ email: form.value.email.trim(), password: form.value.password })
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

        <div v-if="error" role="alert" class="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200">
          <p class="font-body text-sm text-red-600">{{ error }}</p>
        </div>

        <form @submit.prevent="onSubmit" class="space-y-4">
          <template v-if="mode === 'register'">
            <div v-for="(n, i) in form.names" :key="`name-${i}`">
              <label :for="`sa-name-${i}`" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">
                {{ form.names.length > 1 ? t('studentAuth.nameLabelN', { n: i + 1 }) : t('studentAuth.nameLabel') }}
              </label>
              <div class="flex gap-2">
                <input
                  :id="`sa-name-${i}`"
                  v-model="form.names[i]"
                  type="text"
                  autocomplete="off"
                  required
                  :disabled="submitting"
                  :placeholder="t('studentAuth.namePlaceholder')"
                  class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-navy-100 text-navy-800 font-body text-sm placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 transition-all duration-300 disabled:opacity-50"
                />
                <button
                  v-if="form.names.length > 1"
                  type="button"
                  @click="removeName(i)"
                  :disabled="submitting"
                  :aria-label="t('studentAuth.removeStudent')"
                  class="shrink-0 px-3 rounded-xl border border-navy-100 text-navy-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 focus:outline-none"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- One account covers the whole family — extra names share this
                 login and show up side by side on the homework dashboard. -->
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label class="inline-flex items-center gap-2 font-body text-sm text-navy-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  :checked="multipleStudents"
                  @change="onMultipleToggle"
                  :disabled="submitting"
                  class="w-4 h-4 rounded border-navy-300 text-academic-600 focus:ring-academic-400"
                />
                {{ t('studentAuth.multipleLabel') }}
              </label>
              <button
                v-if="multipleStudents && form.names.length < MAX_STUDENTS"
                type="button"
                @click="addName"
                :disabled="submitting"
                class="inline-flex items-center gap-1 font-body text-xs font-semibold text-academic-700 hover:text-academic-800 hover:underline underline-offset-2 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none rounded"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {{ t('studentAuth.addStudent') }}
              </button>
            </div>
            <p v-if="multipleStudents" class="font-body text-xs text-navy-400 -mt-1">{{ t('studentAuth.multipleHint') }}</p>
          </template>

          <div>
            <label for="sa-email" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">
              {{ t('studentAuth.emailLabel') }}
            </label>
            <input
              id="sa-email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              required
              :disabled="submitting"
              :placeholder="t('studentAuth.emailPlaceholder')"
              class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-navy-100 text-navy-800 font-body text-sm placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 transition-all duration-300 disabled:opacity-50"
            />
            <p v-if="mode === 'register'" class="mt-1.5 font-body text-xs text-navy-400">{{ t('studentAuth.emailHint') }}</p>
          </div>

          <div v-if="mode === 'register'">
            <label for="sa-phone" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">
              {{ t('studentAuth.phoneLabel') }}
            </label>
            <input
              id="sa-phone"
              :value="form.phone"
              @input="onPhoneInput"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              required
              :disabled="submitting"
              placeholder="(504) 373-9778"
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
