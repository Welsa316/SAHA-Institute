<script setup>
import { useI18n } from '../composables/useI18n'
import { useIntersectionReveal } from '../composables/useIntersectionReveal'
import StudentSignupForm from '../components/StudentSignupForm.vue'

// Public landing page for year-round tutoring signups. Separate from /enroll
// (which is for time-bounded events — workshops + summer camp). The user was
// explicit that the "Summer Signups" CTA shouldn't be conflated with permanent
// tutoring enrollment, so this lives at its own URL with its own copy.
//
// Submissions land in the students table with program='regular' and appear on
// /admin/students for Anila to manage.

const { t } = useI18n()
const { sectionRef, isVisible } = useIntersectionReveal(0.1)
</script>

<template>
  <main>
    <!-- Dark hero — matches /enroll and other long-form public pages. -->
    <section class="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-[#001B3D]">
      <div class="absolute inset-0" style="background: radial-gradient(ellipse 80% 60% at 50% 20%, rgba(100,160,255,0.18) 0%, transparent 70%);"></div>
      <div class="relative max-w-4xl mx-auto px-6 md:px-12 text-center">
        <div class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-academic-500/15 border border-academic-400/30 mb-6">
          <div class="w-1.5 h-1.5 rounded-full bg-academic-300"></div>
          <span class="font-body text-[10px] tracking-[0.3em] uppercase text-academic-200 font-bold">{{ t('tutoringSignup.heroBadge') }}</span>
        </div>
        <h1 class="font-heading text-4xl md:text-5xl lg:text-6xl text-white font-extrabold tracking-tight leading-tight mb-5">
          {{ t('tutoringSignup.heroHeading') }} <span class="gradient-text-light">{{ t('tutoringSignup.heroHighlight') }}</span>
        </h1>
        <p class="font-body text-lg md:text-xl text-white/70 font-normal max-w-2xl mx-auto leading-relaxed">
          {{ t('tutoringSignup.heroSubtitle') }}
        </p>
      </div>
    </section>

    <!-- Form panel -->
    <section ref="sectionRef" class="relative py-20 md:py-28 bg-gradient-to-b from-slate-50 to-white">
      <div class="max-w-3xl mx-auto px-6 md:px-12">
        <div
          class="bg-white rounded-3xl border border-navy-100/60 shadow-xl shadow-navy-900/[0.04] p-8 md:p-10 transition-all duration-700 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <StudentSignupForm />
        </div>

        <!-- Reassurance row under the card — what happens after they sign up. -->
        <div class="mt-10 grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div class="text-center">
            <div class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-academic-50 border border-academic-200 mb-2">
              <span class="font-heading text-academic-700 font-bold">1</span>
            </div>
            <p class="font-body text-sm text-navy-600">{{ t('tutoringSignup.step1') }}</p>
          </div>
          <div class="text-center">
            <div class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-academic-50 border border-academic-200 mb-2">
              <span class="font-heading text-academic-700 font-bold">2</span>
            </div>
            <p class="font-body text-sm text-navy-600">{{ t('tutoringSignup.step2') }}</p>
          </div>
          <div class="text-center">
            <div class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-academic-50 border border-academic-200 mb-2">
              <span class="font-heading text-academic-700 font-bold">3</span>
            </div>
            <p class="font-body text-sm text-navy-600">{{ t('tutoringSignup.step3') }}</p>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
