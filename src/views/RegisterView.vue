<script setup>
import { ref } from 'vue'
import { useI18n } from '../composables/useI18n'

// Public student registration — name only. The student-facing form collects
// nothing but a name; the admin assigns grade and approves later. On submit it
// POSTs to /api/student-signup, which records a PENDING student and emails
// Anila for review. No login/portal — registration is a one-shot record-a-name.

const { t } = useI18n()

const name = ref('')
const submitting = ref(false)
const submitted = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  if (name.value.trim().length < 2) {
    error.value = t('register.errors.nameRequired')
    return
  }
  submitting.value = true
  try {
    const res = await fetch('/api/student-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.value.trim() }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || t('register.errors.generic'))
    }
    submitted.value = true
    name.value = ''
  } catch (err) {
    error.value = err?.message || t('register.errors.generic')
  } finally {
    submitting.value = false
  }
}

function reset() {
  submitted.value = false
  error.value = ''
}
</script>

<template>
  <main class="min-h-screen bg-[#001B3D] flex items-center justify-center px-6 py-20 relative overflow-hidden">
    <div class="absolute inset-0" style="background: radial-gradient(ellipse 70% 50% at 50% 30%, rgba(100,160,255,0.18) 0%, transparent 70%);"></div>

    <div class="relative w-full max-w-md">
      <router-link to="/" class="flex justify-center mb-8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none rounded-lg">
        <img src="/logo.png" alt="SAHA Institute — home" class="h-12 w-auto brightness-0 invert opacity-95" width="464" height="114" />
      </router-link>

      <div class="bg-white rounded-3xl shadow-2xl shadow-black/30 p-8 md:p-10">
        <!-- Success state -->
        <div v-if="submitted" class="text-center py-4">
          <div class="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-6">
            <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 class="font-heading text-2xl font-bold text-navy-900 mb-3">{{ t('register.successHeading') }}</h1>
          <p class="font-body text-sm text-navy-500 leading-relaxed mb-8">{{ t('register.successBody') }}</p>
          <button
            type="button"
            @click="reset"
            class="inline-flex items-center gap-2 px-7 py-3 rounded-full font-body text-sm font-semibold tracking-wider uppercase text-navy-700 border border-navy-200 hover:bg-navy-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
          >
            {{ t('register.registerAnother') }}
          </button>
        </div>

        <!-- Form -->
        <template v-else>
          <h1 class="font-heading text-2xl md:text-3xl font-extrabold text-navy-900 tracking-tight mb-1">
            {{ t('register.heading') }}
          </h1>
          <p class="font-body text-sm text-navy-500 mb-7">{{ t('register.subtitle') }}</p>

          <div v-if="error" class="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200">
            <p class="font-body text-sm text-red-600">{{ error }}</p>
          </div>

          <form @submit.prevent="onSubmit" class="space-y-5">
            <div>
              <label for="reg-name" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">
                {{ t('register.nameLabel') }}
              </label>
              <input
                id="reg-name"
                v-model="name"
                type="text"
                autocomplete="name"
                required
                :disabled="submitting"
                :placeholder="t('register.namePlaceholder')"
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
              {{ submitting ? t('register.submitting') : t('register.submit') }}
            </button>
          </form>

          <p class="mt-6 font-body text-xs text-navy-400 leading-relaxed text-center">
            {{ t('register.footnote') }}
          </p>
        </template>
      </div>
    </div>
  </main>
</template>
