<script setup>
import { ref, computed } from 'vue'
import { useI18n } from '../composables/useI18n'
import { WORKSHOPS, WORKSHOP_DATES } from '../constants/workshops.js'

// The workshop signup form, decoupled from any page-level chrome. Currently
// only WorkshopSignupModal renders it (the form lives in the modal on /enroll),
// but it stays a standalone component so a future page can drop it in too —
// e.g. an inline embed in an email-marketing landing page.
//
// Form state, validation, and the fetch all live here. Emits `submitted` after
// a successful POST so the modal can auto-close after the success state shows.
//
// Props:
//   compact  — drop the heading + intro line. Used inside the modal where the
//              modal title already says "Workshop registration".

const props = defineProps({
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['submitted'])

const { t } = useI18n()

// The catalog of workshops parents can pick from lives in a shared constants
// file (src/constants/workshops.js) so the admin filter dropdown reads the
// same source. If WORKSHOPS ever goes empty (unlikely now, but say the
// summer's over and we haven't backfilled next season's list), the form
// gracefully shows a "Workshop list coming soon" notice — see
// workshopsAvailable below.

const form = ref({
  parentName: '',
  studentName: '',
  workshops: [],
  additionalNotes: '',
})

const sending = ref(false)
const sent = ref(false)
const error = ref('')

const workshopsAvailable = computed(() => WORKSHOPS.length > 0)

function toggleWorkshop(name) {
  const idx = form.value.workshops.indexOf(name)
  if (idx === -1) form.value.workshops.push(name)
  else form.value.workshops.splice(idx, 1)
}

function isSelected(name) {
  return form.value.workshops.includes(name)
}

async function submitForm() {
  error.value = ''

  // Only the registrant's full name is required. Student name is optional —
  // a student filling for themselves leaves it blank, a parent filling for a
  // kid fills it in.
  if (!form.value.parentName.trim()) {
    error.value = t('signup.errors.nameRequired')
    return
  }
  if (form.value.workshops.length === 0) {
    error.value = t('signup.errors.workshopRequired')
    return
  }

  sending.value = true
  try {
    const res = await fetch('/api/workshop-signups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentName: form.value.parentName.trim(),
        // Send null when blank so the DB stores absence as NULL rather than
        // a literal empty string (cleaner queries downstream).
        studentName: form.value.studentName.trim() || null,
        workshops: form.value.workshops,
        additionalNotes: form.value.additionalNotes.trim() || null,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || t('signup.errors.generic'))
    }

    sent.value = true
    emit('submitted')
    form.value = { parentName: '', studentName: '', workshops: [], additionalNotes: '' }
  } catch (err) {
    error.value = err?.message || t('signup.errors.generic')
    console.error(err)
  } finally {
    sending.value = false
  }
}

function resetForm() {
  sent.value = false
  error.value = ''
}
</script>

<template>
  <!-- Success state -->
  <div v-if="sent" class="text-center py-6">
    <div class="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-6">
      <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h3 class="font-heading text-2xl font-semibold text-navy-900 mb-3">{{ t('signup.successHeading') }}</h3>
    <p class="font-body text-navy-500 leading-relaxed mb-8 max-w-sm mx-auto">
      {{ t('signup.successBody') }}
    </p>
    <button
      type="button"
      @click="resetForm"
      class="inline-flex items-center gap-2 px-8 py-3 rounded-full font-body text-sm font-semibold tracking-wider uppercase text-navy-700 border border-navy-200 hover:bg-navy-50 transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
    >
      {{ t('signup.signAnother') }}
    </button>
  </div>

  <!-- Form body -->
  <template v-else>
    <template v-if="!compact">
      <h3 class="font-heading text-xl font-semibold text-navy-900 mb-1">{{ t('signup.formHeading') }}</h3>
      <p class="font-body text-sm text-navy-500 mb-8">{{ t('signup.formSubtitle') }}</p>
    </template>

    <div v-if="error" class="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
      <p class="font-body text-sm text-red-600">{{ error }}</p>
    </div>

    <form @submit.prevent="submitForm" class="space-y-5">
      <!-- Full name (required) + optional student name. The form might be
           filled by a parent on behalf of a kid (use both fields) OR by a
           student themselves (just the top field). -->
      <div class="grid sm:grid-cols-2 gap-5">
        <div>
          <label for="wsf-parent" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">
            {{ t('signup.fullNameLabel') }}
          </label>
          <input
            id="wsf-parent"
            v-model="form.parentName"
            type="text"
            required
            :disabled="sending"
            :placeholder="t('signup.fullNamePlaceholder')"
            class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-navy-100 text-navy-800 font-body text-sm placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 transition-all duration-300 disabled:opacity-50"
          />
        </div>
        <div>
          <label for="wsf-student" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">
            {{ t('signup.studentLabelOptional') }}
          </label>
          <input
            id="wsf-student"
            v-model="form.studentName"
            type="text"
            :disabled="sending"
            :placeholder="t('signup.studentPlaceholder')"
            class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-navy-100 text-navy-800 font-body text-sm placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 transition-all duration-300 disabled:opacity-50"
          />
        </div>
      </div>

      <!-- Workshops -->
      <div>
        <label class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">
          {{ t('signup.workshopsLabel') }}
        </label>
        <div v-if="workshopsAvailable" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            v-for="workshop in WORKSHOPS"
            :key="workshop"
            type="button"
            :disabled="sending"
            @click="toggleWorkshop(workshop)"
            class="text-left px-4 py-3 rounded-xl border font-body text-sm transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none disabled:opacity-50"
            :class="isSelected(workshop)
              ? 'bg-academic-50 border-academic-400 text-navy-900 font-semibold'
              : 'bg-slate-50 border-navy-100 text-navy-700 hover:bg-white hover:border-academic-200'"
          >
            <span class="flex items-start gap-2">
              <span
                class="w-4 h-4 mt-0.5 shrink-0 rounded border flex items-center justify-center transition-colors"
                :class="isSelected(workshop) ? 'bg-academic-500 border-academic-500' : 'bg-white border-navy-200'"
              >
                <svg v-if="isSelected(workshop)" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span>
                {{ workshop }}
                <span v-if="WORKSHOP_DATES[workshop]" class="block font-body text-[11px] font-semibold text-academic-700 tabular-nums mt-0.5">{{ WORKSHOP_DATES[workshop] }}</span>
              </span>
            </span>
          </button>
        </div>
        <div v-else class="px-4 py-6 rounded-xl bg-slate-50 border border-dashed border-navy-200 text-center">
          <p class="font-body text-sm text-navy-500">{{ t('signup.workshopsPending') }}</p>
          <p class="font-body text-xs text-navy-400 mt-1">{{ t('signup.workshopsPendingHint') }}</p>
        </div>
      </div>

      <!-- Notes -->
      <div>
        <label for="wsf-notes" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">
          {{ t('signup.notesLabel') }}
        </label>
        <textarea
          id="wsf-notes"
          v-model="form.additionalNotes"
          :disabled="sending"
          rows="4"
          :placeholder="t('signup.notesPlaceholder')"
          class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-navy-100 text-navy-800 font-body text-sm placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 transition-all duration-300 resize-none disabled:opacity-50"
        ></textarea>
      </div>

      <!-- Submit -->
      <button
        type="submit"
        :disabled="sending || !workshopsAvailable"
        class="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-4 bg-gradient-to-r from-navy-800 to-academic-600 text-white font-body text-sm font-semibold tracking-wider uppercase rounded-full overflow-hidden transition-all duration-500 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-academic-500/20 disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
      >
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        <svg v-if="sending" class="relative w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="relative">{{ sending ? t('signup.submitting') : t('signup.submit') }}</span>
      </button>
    </form>
  </template>
</template>
