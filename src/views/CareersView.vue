<script setup>
import { reactive, ref } from 'vue'
import { useI18n } from '../composables/useI18n'

// Public tutor application. No account, no DB — the submission (with an
// optional resume attachment) is emailed straight to the SAHA inbox by
// POST /api/tutor-applications. Client-side we pre-validate the file type and
// size so nobody uploads 5MB just to get a 400 back.

const { t } = useI18n()

const form = reactive({
  name: '',
  email: '',
  phone: '',
  country: '',
  age: '',
  gender: '',
  education: '',
})

const resume = ref(null) // { fileName, base64 }
const resumeError = ref('')
const error = ref('')
const submitting = ref(false)
const submitted = ref(false)

const MAX_RESUME_BYTES = 5 * 1024 * 1024

function onResumeChange(e) {
  resumeError.value = ''
  const file = e.target.files?.[0]
  if (!file) return
  if (!/\.(pdf|docx?)$/i.test(file.name)) {
    resumeError.value = t('careers.form.errors.resumeType')
    e.target.value = ''
    return
  }
  if (file.size > MAX_RESUME_BYTES) {
    resumeError.value = t('careers.form.errors.resumeSize')
    e.target.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    // readAsDataURL gives "data:<mime>;base64,<payload>" — server wants payload only.
    const base64 = String(reader.result).split(',')[1] ?? ''
    resume.value = { fileName: file.name, base64 }
  }
  reader.readAsDataURL(file)
}

function removeResume() {
  resume.value = null
  resumeError.value = ''
  const input = document.getElementById('app-resume')
  if (input) input.value = ''
}

function validate() {
  const { name, email, phone, country, age, gender, education } = form
  if (!name.trim() || !email.trim() || !phone.trim() || !country.trim() || !age || !gender) {
    return t('careers.form.errors.required')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return t('careers.form.errors.email')
  if (Number(age) < 18) return t('careers.form.errors.age')
  if (education.trim().length < 10) return t('careers.form.errors.education')
  return ''
}

async function submit() {
  error.value = ''
  const problem = validate()
  if (problem) {
    error.value = problem
    return
  }
  submitting.value = true
  try {
    const res = await fetch('/api/tutor-applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        country: form.country.trim(),
        age: Number(form.age),
        gender: form.gender,
        education: form.education.trim(),
        ...(resume.value ? { resume: resume.value } : {}),
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || t('careers.form.errors.generic'))
    }
    submitted.value = true
  } catch (err) {
    error.value = err.message || t('careers.form.errors.generic')
  } finally {
    submitting.value = false
  }
}

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-slate-50 border border-navy-100 text-navy-800 text-sm font-body placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 disabled:opacity-60'
const labelClass = 'block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5'
</script>

<template>
  <main>
    <!-- Header band -->
    <section class="relative bg-[#001B3D] pt-36 pb-20 md:pt-44 md:pb-24 overflow-hidden">
      <div class="relative max-w-3xl mx-auto px-6 md:px-12 text-center">
        <div class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/15 mb-6">
          <div class="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
          <span class="font-body text-[10px] tracking-[0.3em] uppercase text-white/80 font-bold">{{ t('careers.badge') }}</span>
        </div>
        <h1 class="font-heading text-4xl md:text-6xl text-white font-extrabold tracking-tight">
          {{ t('careers.heading') }}
        </h1>
        <p class="mt-5 font-body text-lg text-white/70 max-w-xl mx-auto">
          {{ t('careers.subtitle') }}
        </p>
      </div>
    </section>

    <!-- Application form -->
    <section class="py-16 md:py-24 bg-navy-50/30">
      <div class="max-w-2xl mx-auto px-6 md:px-12">
        <div v-if="submitted" class="bg-white rounded-3xl border border-navy-100 shadow-sm p-8 md:p-12 text-center">
          <div class="w-14 h-14 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-6">
            <svg class="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 class="font-heading text-2xl font-bold text-[#001B3D] mb-3">{{ t('careers.form.successHeading') }}</h2>
          <p class="font-body text-sm text-navy-500 leading-relaxed">{{ t('careers.form.successBody') }}</p>
        </div>

        <form v-else @submit.prevent="submit" class="bg-white rounded-3xl border border-navy-100 shadow-sm p-6 md:p-10 space-y-5" novalidate>
          <div v-if="error" role="alert" class="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-body">
            {{ error }}
          </div>

          <div class="grid sm:grid-cols-2 gap-5">
            <div>
              <label for="app-name" :class="labelClass">{{ t('careers.form.name') }}</label>
              <input id="app-name" v-model="form.name" type="text" autocomplete="name" required :disabled="submitting" :class="inputClass" />
            </div>
            <div>
              <label for="app-email" :class="labelClass">{{ t('careers.form.email') }}</label>
              <input id="app-email" v-model="form.email" type="email" autocomplete="email" required :disabled="submitting" :class="inputClass" dir="ltr" />
            </div>
            <div>
              <label for="app-phone" :class="labelClass">{{ t('careers.form.phone') }}</label>
              <input id="app-phone" v-model="form.phone" type="tel" inputmode="tel" autocomplete="tel" required :disabled="submitting" :class="inputClass" dir="ltr" />
            </div>
            <div>
              <label for="app-country" :class="labelClass">{{ t('careers.form.country') }}</label>
              <input id="app-country" v-model="form.country" type="text" autocomplete="country-name" required :disabled="submitting" :class="inputClass" />
            </div>
            <div>
              <label for="app-age" :class="labelClass">{{ t('careers.form.age') }}</label>
              <input id="app-age" v-model="form.age" type="number" min="18" max="90" inputmode="numeric" required :disabled="submitting" :class="inputClass" />
            </div>
            <div>
              <label for="app-gender" :class="labelClass">{{ t('careers.form.gender') }}</label>
              <select id="app-gender" v-model="form.gender" required :disabled="submitting" :class="inputClass">
                <option value="" disabled>{{ t('careers.form.genderPlaceholder') }}</option>
                <option value="female">{{ t('careers.form.genderOptions.female') }}</option>
                <option value="male">{{ t('careers.form.genderOptions.male') }}</option>
                <option value="prefer_not">{{ t('careers.form.genderOptions.prefer_not') }}</option>
              </select>
            </div>
          </div>

          <div>
            <label for="app-education" :class="labelClass">{{ t('careers.form.education') }}</label>
            <textarea
              id="app-education"
              v-model="form.education"
              rows="5"
              required
              :disabled="submitting"
              :class="inputClass"
              class="resize-none"
              aria-describedby="app-education-hint"
            ></textarea>
            <p id="app-education-hint" class="mt-1.5 font-body text-xs text-navy-400">{{ t('careers.form.educationHint') }}</p>
          </div>

          <div>
            <span :class="labelClass">{{ t('careers.form.resume') }}</span>
            <div class="flex flex-wrap items-center gap-3">
              <input
                id="app-resume"
                type="file"
                accept=".pdf,.doc,.docx"
                :disabled="submitting"
                @change="onResumeChange"
                aria-describedby="app-resume-hint"
                class="block w-full font-body text-sm text-navy-500 file:me-4 file:px-5 file:py-2.5 file:rounded-full file:border-0 file:bg-[#001B3D] file:text-white file:font-body file:text-xs file:font-bold file:tracking-wider file:uppercase hover:file:bg-navy-800 file:cursor-pointer cursor-pointer"
              />
              <button
                v-if="resume"
                type="button"
                @click="removeResume"
                class="font-body text-xs font-semibold text-red-600 hover:text-red-700 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 focus:outline-none"
              >
                {{ t('careers.form.resumeRemove') }} ({{ resume.fileName }})
              </button>
            </div>
            <p id="app-resume-hint" class="mt-1.5 font-body text-xs text-navy-400">{{ t('careers.form.resumeHint') }}</p>
            <p v-if="resumeError" role="alert" class="mt-1.5 font-body text-xs text-red-600">{{ resumeError }}</p>
          </div>

          <button
            type="submit"
            :disabled="submitting"
            class="w-full px-6 py-4 rounded-full bg-[#001B3D] text-white font-body text-sm font-bold tracking-wider uppercase hover:bg-navy-800 transition-colors motion-reduce:transition-none disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
          >
            {{ submitting ? t('careers.form.submitting') : t('careers.form.submit') }}
          </button>
        </form>
      </div>
    </section>
  </main>
</template>
