<script setup>
import { ref } from 'vue'
import { useI18n } from '../composables/useI18n'

// Public tutoring-signup form. Stateless on the outside — emits `submitted`
// after a successful POST so the page (or modal, if we ever add one) can
// react. Mirrors WorkshopSignupForm in shape; different fields and a
// different endpoint.

const props = defineProps({
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['submitted'])

const { t } = useI18n()

const form = ref({
  parentName: '',
  studentName: '',
  gradeLevel: 'elementary',
  phoneNumber: '',
  notes: '',
})

const sending = ref(false)
const sent = ref(false)
const error = ref('')

async function submitForm() {
  error.value = ''

  if (!form.value.parentName.trim() || !form.value.studentName.trim()) {
    error.value = t('tutoringSignup.errors.namesRequired')
    return
  }

  sending.value = true
  try {
    const res = await fetch('/api/student-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentName: form.value.parentName.trim(),
        studentName: form.value.studentName.trim(),
        gradeLevel: form.value.gradeLevel,
        // Empty -> null so the DB carries an honest absence rather than ''
        phoneNumber: form.value.phoneNumber.trim() || null,
        notes: form.value.notes.trim() || null,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || t('tutoringSignup.errors.generic'))
    }

    sent.value = true
    emit('submitted')
    form.value = { parentName: '', studentName: '', gradeLevel: 'elementary', phoneNumber: '', notes: '' }
  } catch (err) {
    error.value = err?.message || t('tutoringSignup.errors.generic')
    console.error(err)
  } finally {
    sending.value = false
  }
}

function resetForm() {
  sent.value = false
  error.value = ''
}

// Same grade options as the admin Add Student modal.
const gradeOptions = [
  { value: 'elementary', label: 'Elementary' },
  { value: 'middle', label: 'Middle School' },
  { value: 'high', label: 'High School' },
]
</script>

<template>
  <!-- Success state -->
  <div v-if="sent" class="text-center py-6">
    <div class="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-6">
      <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h3 class="font-heading text-2xl font-semibold text-navy-900 mb-3">{{ t('tutoringSignup.successHeading') }}</h3>
    <p class="font-body text-navy-500 leading-relaxed mb-8 max-w-sm mx-auto">
      {{ t('tutoringSignup.successBody') }}
    </p>
    <button
      type="button"
      @click="resetForm"
      class="inline-flex items-center gap-2 px-8 py-3 rounded-full font-body text-sm font-semibold tracking-wider uppercase text-navy-700 border border-navy-200 hover:bg-navy-50 transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
    >
      {{ t('tutoringSignup.registerAnother') }}
    </button>
  </div>

  <!-- Form body -->
  <template v-else>
    <template v-if="!compact">
      <h3 class="font-heading text-xl font-semibold text-navy-900 mb-1">{{ t('tutoringSignup.formHeading') }}</h3>
      <p class="font-body text-sm text-navy-500 mb-8">{{ t('tutoringSignup.formSubtitle') }}</p>
    </template>

    <div v-if="error" class="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
      <p class="font-body text-sm text-red-600">{{ error }}</p>
    </div>

    <form @submit.prevent="submitForm" class="space-y-5">
      <!-- Parent + student names -->
      <div class="grid sm:grid-cols-2 gap-5">
        <div>
          <label for="tsf-parent" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">
            {{ t('tutoringSignup.parentLabel') }}
          </label>
          <input
            id="tsf-parent"
            v-model="form.parentName"
            type="text"
            required
            :disabled="sending"
            :placeholder="t('tutoringSignup.parentPlaceholder')"
            class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-navy-100 text-navy-800 font-body text-sm placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 transition-all duration-300 disabled:opacity-50"
          />
        </div>
        <div>
          <label for="tsf-student" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">
            {{ t('tutoringSignup.studentLabel') }}
          </label>
          <input
            id="tsf-student"
            v-model="form.studentName"
            type="text"
            required
            :disabled="sending"
            :placeholder="t('tutoringSignup.studentPlaceholder')"
            class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-navy-100 text-navy-800 font-body text-sm placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 transition-all duration-300 disabled:opacity-50"
          />
        </div>
      </div>

      <!-- Grade + phone -->
      <div class="grid sm:grid-cols-2 gap-5">
        <div>
          <label for="tsf-grade" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">
            {{ t('tutoringSignup.gradeLabel') }}
          </label>
          <select
            id="tsf-grade"
            v-model="form.gradeLevel"
            :disabled="sending"
            class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-navy-100 text-navy-800 font-body text-sm focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 transition-all duration-300 disabled:opacity-50"
          >
            <option v-for="opt in gradeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div>
          <label for="tsf-phone" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">
            {{ t('tutoringSignup.phoneLabel') }}
          </label>
          <input
            id="tsf-phone"
            v-model="form.phoneNumber"
            type="tel"
            :disabled="sending"
            :placeholder="t('tutoringSignup.phonePlaceholder')"
            class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-navy-100 text-navy-800 font-body text-sm placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 transition-all duration-300 disabled:opacity-50"
          />
        </div>
      </div>

      <!-- Notes -->
      <div>
        <label for="tsf-notes" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">
          {{ t('tutoringSignup.notesLabel') }}
        </label>
        <textarea
          id="tsf-notes"
          v-model="form.notes"
          :disabled="sending"
          rows="4"
          :placeholder="t('tutoringSignup.notesPlaceholder')"
          class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-navy-100 text-navy-800 font-body text-sm placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 transition-all duration-300 resize-none disabled:opacity-50"
        ></textarea>
      </div>

      <!-- Submit -->
      <button
        type="submit"
        :disabled="sending"
        class="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-4 bg-gradient-to-r from-navy-800 to-academic-600 text-white font-body text-sm font-semibold tracking-wider uppercase rounded-full overflow-hidden transition-all duration-500 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-academic-500/20 disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
      >
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        <svg v-if="sending" class="relative w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="relative">{{ sending ? t('tutoringSignup.submitting') : t('tutoringSignup.submit') }}</span>
      </button>
    </form>
  </template>
</template>
