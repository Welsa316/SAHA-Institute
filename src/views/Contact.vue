<script setup>
import { ref } from 'vue'
import { useIntersectionReveal } from '../composables/useIntersectionReveal'
import { useI18n } from '../composables/useI18n'
import { formatPhoneInput } from '../utils/phone.js'

const { t } = useI18n()

const form = ref({
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
})

function onPhoneInput(e) {
  // Live-format to (504) 373-9778 as the user types.
  form.value.phone = formatPhoneInput(e.target.value)
}

const sending = ref(false)
const sent = ref(false)
const error = ref('')

const { sectionRef, isVisible } = useIntersectionReveal(0.1)

async function submitForm() {
  sending.value = true
  error.value = ''

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.value.name,
        email: form.value.email,
        phone: form.value.phone,
        subject: form.value.subject,
        message: form.value.message,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to send message')
    }

    sent.value = true
    form.value = { name: '', email: '', phone: '', subject: '', message: '' }
  } catch (err) {
    error.value = t('contact.errorMessage')
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
  <!-- Hero banner -->
  <section class="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950"></div>
    <div
      class="absolute inset-0"
      style="
        background: radial-gradient(ellipse at 20% 50%, rgba(74, 154, 204, 0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 30%, rgba(91, 173, 217, 0.1) 0%, transparent 50%);
      "
    ></div>
    <div
      class="absolute inset-0 opacity-[0.04]"
      style="background-image: radial-gradient(circle, #fff 1px, transparent 1px); background-size: 24px 24px"
    ></div>

    <div class="relative max-w-4xl mx-auto px-6 md:px-12 text-center">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.08] border border-white/[0.08] mb-6">
        <div class="w-1.5 h-1.5 rounded-full bg-academic-400"></div>
        <span class="font-body text-xs tracking-[0.2em] uppercase text-academic-300 font-medium">{{ t('contact.badge') }}</span>
      </div>
      <h1 class="font-heading text-4xl md:text-5xl lg:text-6xl text-white font-semibold leading-tight mb-4">
        {{ t('contact.heading') }} <span class="gradient-text-light">{{ t('contact.headingHighlight') }}</span>
      </h1>
      <p class="font-body text-lg md:text-xl text-navy-300 font-normal max-w-lg mx-auto leading-relaxed">
        {{ t('contact.subtitle') }}
      </p>
    </div>
  </section>

  <!-- Contact content -->
  <section ref="sectionRef" class="relative py-20 md:py-28 bg-gradient-to-b from-slate-50 to-white">
    <div class="max-w-6xl mx-auto px-6 md:px-12">
      <div class="grid lg:grid-cols-5 gap-12 lg:gap-16">
        <!-- Contact info side -->
        <div
          class="lg:col-span-2 transition-all duration-700 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <h2 class="font-heading text-2xl md:text-3xl text-navy-900 font-semibold mb-6">
            {{ t('contact.conversationHeading') }}
          </h2>
          <p class="font-body text-navy-600 leading-relaxed mb-10">
            {{ t('contact.conversationSubtitle') }}
          </p>

          <!-- Contact details -->
          <div class="space-y-6">
            <!-- Address -->
            <div class="flex items-start gap-4 group">
              <div class="flex-shrink-0 w-11 h-11 rounded-xl bg-navy-50 border border-navy-100 flex items-center justify-center text-navy-600 group-hover:bg-academic-50 group-hover:border-academic-200 group-hover:text-academic-600 transition-all duration-300">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div>
                <p class="font-body text-sm font-semibold text-navy-800">{{ t('contact.addressLabel') }}</p>
                <p class="font-body text-sm text-navy-500 leading-relaxed">{{ t('footer.address') }}</p>
              </div>
            </div>

            <!-- Phone -->
            <div class="flex items-start gap-4 group">
              <div class="flex-shrink-0 w-11 h-11 rounded-xl bg-navy-50 border border-navy-100 flex items-center justify-center text-navy-600 group-hover:bg-academic-50 group-hover:border-academic-200 group-hover:text-academic-600 transition-all duration-300">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <p class="font-body text-sm font-semibold text-navy-800">{{ t('contact.phoneLabel') }}</p>
                <a href="tel:+15046673625" class="font-body text-sm text-navy-500 hover:text-academic-600 transition-colors"><span class="text-navy-400">{{ t('footer.phoneCall') }}:</span> (504) 667-3625</a>
                <br/>
                <a href="https://wa.me/15043739778" target="_blank" rel="noopener" class="font-body text-sm text-navy-400 hover:text-academic-600 transition-colors"><span class="text-navy-400">{{ t('footer.phoneText') }}:</span> (504) 373-9778</a>
              </div>
            </div>

            <!-- Hours -->
            <div class="flex items-start gap-4 group">
              <div class="flex-shrink-0 w-11 h-11 rounded-xl bg-navy-50 border border-navy-100 flex items-center justify-center text-navy-600 group-hover:bg-academic-50 group-hover:border-academic-200 group-hover:text-academic-600 transition-all duration-300">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p class="font-body text-sm font-semibold text-navy-800">{{ t('contact.hoursLabel') }}</p>
                <p class="font-body text-sm text-navy-500">{{ t('footer.hours') }}</p>
              </div>
            </div>

            <!-- Email -->
            <div class="flex items-start gap-4 group">
              <div class="flex-shrink-0 w-11 h-11 rounded-xl bg-navy-50 border border-navy-100 flex items-center justify-center text-navy-600 group-hover:bg-academic-50 group-hover:border-academic-200 group-hover:text-academic-600 transition-all duration-300">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p class="font-body text-sm font-semibold text-navy-800">{{ t('contact.emailLabel') }}</p>
                <a href="mailto:sahaforlearning@gmail.com" class="font-body text-sm text-navy-500 hover:text-academic-600 transition-colors">sahaforlearning@gmail.com</a>
              </div>
            </div>

          </div>

          <!-- Map embed -->
          <div class="mt-10 rounded-2xl overflow-hidden border border-navy-100 shadow-lg shadow-navy-900/[0.04]">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3455.6!2d-90.35!3d29.99!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8620a5b0c9eee48f%3A0x0!2s1201+Vintage+Dr%2C+Kenner%2C+LA+70065!5e0!3m2!1sen!2sus!4v1700000000000"
              width="100%"
              height="220"
              style="border: 0"
              allowfullscreen=""
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              title="SAHA Institute Location"
            ></iframe>
          </div>
        </div>

        <!-- Contact form side -->
        <div
          class="lg:col-span-3 transition-all duration-700 delay-150 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <div class="bg-white rounded-3xl border border-navy-100/60 shadow-xl shadow-navy-900/[0.04] p-8 md:p-10">
            <!-- Success confirmation -->
            <div v-if="sent" class="text-center py-8">
              <div class="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-6">
                <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 class="font-heading text-2xl font-semibold text-navy-900 mb-3">{{ t('contact.successHeading') }}</h3>
              <p class="font-body text-navy-500 leading-relaxed mb-8 max-w-sm mx-auto">
                {{ t('contact.successBody') }}
              </p>
              <button
                @click="resetForm"
                class="inline-flex items-center gap-2 px-8 py-3 rounded-full font-body text-sm font-semibold tracking-wider uppercase text-navy-700 border border-navy-200 hover:bg-navy-50 transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
              >
                {{ t('contact.sendAnother') }}
              </button>
            </div>

            <!-- Contact form -->
            <template v-else>
              <h3 class="font-heading text-xl font-semibold text-navy-900 mb-1">{{ t('contact.formHeading') }}</h3>
              <p class="font-body text-sm text-navy-500 mb-8">{{ t('contact.formSubtitle') }}</p>

              <!-- Error message -->
              <div v-if="error" class="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
                <p class="font-body text-sm text-red-600">{{ error }}</p>
              </div>

              <form @submit.prevent="submitForm" class="space-y-5">
                <!-- Name + Email row -->
                <div class="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label for="contact-name" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">{{ t('contact.nameLabel') }}</label>
                    <input
                      id="contact-name"
                      v-model="form.name"
                      type="text"
                      required
                      :disabled="sending"
                      :placeholder="t('contact.namePlaceholder')"
                      class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-navy-100 text-navy-800 font-body text-sm placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 transition-all duration-300 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label for="contact-email" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">{{ t('contact.emailFieldLabel') }}</label>
                    <input
                      id="contact-email"
                      v-model="form.email"
                      type="email"
                      required
                      :disabled="sending"
                      :placeholder="t('contact.emailPlaceholder')"
                      class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-navy-100 text-navy-800 font-body text-sm placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 transition-all duration-300 disabled:opacity-50"
                    />
                  </div>
                </div>

                <!-- Phone + Subject row -->
                <div class="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label for="contact-phone" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">{{ t('contact.phoneFieldLabel') }}</label>
                    <input
                      id="contact-phone"
                      :value="form.phone"
                      @input="onPhoneInput"
                      type="tel"
                      inputmode="tel"
                      :disabled="sending"
                      :placeholder="t('contact.phonePlaceholder')"
                      class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-navy-100 text-navy-800 font-body text-sm placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 transition-all duration-300 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label for="contact-subject" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">{{ t('contact.subjectLabel') }}</label>
                    <select
                      id="contact-subject"
                      v-model="form.subject"
                      :disabled="sending"
                      class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-navy-100 text-navy-800 font-body text-sm focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 transition-all duration-300 disabled:opacity-50"
                    >
                      <option value="">{{ t('contact.subjectDefault') }}</option>
                      <option v-for="(option, idx) in t('contact.subjectOptions')" :key="idx" :value="option">{{ option }}</option>
                    </select>
                  </div>
                </div>

                <!-- Message -->
                <div>
                  <label for="contact-message" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-2">{{ t('contact.messageLabel') }}</label>
                  <textarea
                    id="contact-message"
                    v-model="form.message"
                    required
                    :disabled="sending"
                    rows="5"
                    :placeholder="t('contact.messagePlaceholder')"
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
                  <!-- Loading spinner -->
                  <svg v-if="sending" class="relative w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span class="relative">{{ sending ? t('contact.sending') : t('contact.sendMessage') }}</span>
                  <svg v-if="!sending" class="relative w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </template>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
