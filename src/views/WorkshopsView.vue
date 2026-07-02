<script setup>
import { ref } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useIntersectionReveal } from '../composables/useIntersectionReveal'
import WorkshopSignupModal from '../components/WorkshopSignupModal.vue'

// The July 2026 Summer Workshop Series page — the active offering now that
// camp is done. The full dated lineup and the daily schedule are transcribed
// from the published flyers (crawlable text), with the flyers themselves shown
// alongside. Signup reuses the same modal as /enroll.

const { t } = useI18n()

const modalOpen = ref(false)

const { sectionRef: lineupRef, isVisible: lineupVisible } = useIntersectionReveal(0.1)
const { sectionRef: dailyRef, isVisible: dailyVisible } = useIntersectionReveal(0.15)
const { sectionRef: finalRef, isVisible: finalVisible } = useIntersectionReveal(0.2)
</script>

<template>
  <!-- Hero -->
  <section class="relative py-28 md:py-36 overflow-hidden bg-[#001B3D]">
    <div class="absolute inset-0" style="background: radial-gradient(ellipse 80% 60% at 50% 20%, rgba(251,191,36,0.12) 0%, transparent 70%);"></div>
    <div class="relative max-w-4xl mx-auto px-6 md:px-12 text-center">
      <div class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500/20 border border-amber-400/30 mb-6">
        <div class="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
        <span class="font-body text-[10px] tracking-[0.3em] uppercase text-amber-300 font-bold">{{ t('workshopsPage.heroBadge') }}</span>
      </div>
      <h1 class="font-heading text-4xl md:text-5xl lg:text-6xl text-white font-extrabold tracking-tight leading-tight mb-4">
        {{ t('workshopsPage.heroHeading1') }} <span class="gradient-text-light">{{ t('workshopsPage.heroHeading2') }}</span>
      </h1>
      <p class="font-body text-lg md:text-xl text-white/70 font-normal max-w-xl mx-auto leading-relaxed mb-10">
        {{ t('workshopsPage.heroSubtitle') }}
      </p>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          type="button"
          @click="modalOpen = true"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-amber-400 text-[#001B3D] font-body text-sm font-bold tracking-[0.15em] uppercase hover:bg-amber-300 transition-colors duration-300 shadow-xl shadow-black/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none"
        >
          {{ t('workshopsPage.signupCta') }}
        </button>
        <a
          href="tel:+15046673625"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/20 text-white/80 font-body text-sm font-bold tracking-[0.15em] uppercase hover:border-white/40 hover:text-white transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          {{ t('workshopsPage.callCta') }}
        </a>
      </div>
    </div>
  </section>

  <!-- The lineup -->
  <section ref="lineupRef" class="relative py-20 md:py-28 overflow-hidden">
    <div class="max-w-6xl mx-auto px-6 md:px-12">
      <div
        class="mb-12 transition-all duration-1000 ease-out"
        :class="lineupVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
      >
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-navy-50 border border-navy-100 mb-6">
          <div class="w-1.5 h-1.5 rounded-full bg-academic-500"></div>
          <span class="font-body text-[10px] tracking-[0.3em] uppercase text-navy-600 font-bold">{{ t('workshopsPage.lineupBadge') }}</span>
        </div>
        <h2 class="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#001B3D] tracking-tight mb-4">
          {{ t('workshopsPage.lineupHeading') }}
        </h2>
        <p class="font-body text-navy-500 leading-relaxed max-w-xl">{{ t('workshopsPage.lineupIntro') }}</p>
      </div>

      <div class="grid md:grid-cols-5 gap-10 md:gap-12 items-start">
        <!-- transcribed, crawlable lineup -->
        <ul
          class="md:col-span-3 space-y-3 transition-all duration-1000 ease-out"
          :class="lineupVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <li
            v-for="w in t('workshopsPage.lineup')"
            :key="w.name"
            class="flex items-start gap-4 rounded-xl border border-navy-100 bg-white px-4 py-3.5 shadow-[0_1px_6px_-3px_rgba(2,27,61,0.12)]"
          >
            <span class="shrink-0 min-w-[92px] text-center">
              <span class="block px-2.5 py-1.5 rounded-lg bg-academic-50 border border-academic-100 font-body text-[11px] font-bold text-academic-700 tabular-nums">
                {{ w.date }}
              </span>
              <span v-if="w.price" class="block mt-1 font-body text-[11px] font-bold text-amber-700 tabular-nums">{{ w.price }}</span>
            </span>
            <span>
              <span class="block font-body text-sm font-bold text-navy-900">{{ w.name }}</span>
              <span class="block font-body text-[13px] text-navy-500 leading-snug mt-0.5">{{ w.desc }}</span>
              <span v-if="w.note" class="block font-body text-[12px] font-semibold text-amber-700 leading-snug mt-1">{{ w.note }}</span>
            </span>
          </li>
        </ul>

        <!-- the flyer itself -->
        <div
          class="md:col-span-2 md:sticky md:top-28 transition-all duration-1000 delay-200 ease-out"
          :class="lineupVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <div class="rounded-2xl overflow-hidden shadow-xl shadow-navy-900/10 border border-navy-100 bg-white">
            <picture>
              <source srcset="/workshops/series-july-2026.webp" type="image/webp" />
              <img
                src="/workshops/series-july-2026.jpg"
                :alt="t('workshopsPage.seriesFlyerAlt')"
                width="660"
                height="990"
                class="w-full h-auto"
                loading="lazy"
              />
            </picture>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Daily schedule -->
  <section ref="dailyRef" class="relative py-20 md:py-28 overflow-hidden bg-navy-50/40">
    <div class="max-w-6xl mx-auto px-6 md:px-12">
      <div class="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div
          class="transition-all duration-1000 ease-out"
          :class="dailyVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <div class="rounded-2xl overflow-hidden shadow-xl shadow-navy-900/10 border border-navy-100 bg-white max-w-md mx-auto md:mx-0">
            <picture>
              <source srcset="/workshops/daily-schedule-july.webp" type="image/webp" />
              <img
                src="/workshops/daily-schedule-july.jpg"
                :alt="t('workshopsPage.dailyFlyerAlt')"
                width="652"
                height="984"
                class="w-full h-auto"
                loading="lazy"
              />
            </picture>
          </div>
        </div>
        <div
          class="transition-all duration-1000 delay-200 ease-out"
          :class="dailyVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-navy-50 border border-navy-100 mb-6">
            <div class="w-1.5 h-1.5 rounded-full bg-academic-500"></div>
            <span class="font-body text-[10px] tracking-[0.3em] uppercase text-navy-600 font-bold">{{ t('workshopsPage.dailyBadge') }}</span>
          </div>
          <h2 class="font-heading text-3xl md:text-4xl font-extrabold text-[#001B3D] tracking-tight mb-4">
            {{ t('workshopsPage.dailyHeading') }}
          </h2>
          <p class="font-body text-navy-500 leading-relaxed mb-6 max-w-md">{{ t('workshopsPage.dailyIntro') }}</p>
          <ul class="rounded-xl border border-navy-100 bg-white/80 divide-y divide-navy-100 overflow-hidden mb-8">
            <li v-for="item in t('workshopsPage.dailyItems')" :key="item.time" class="flex items-baseline gap-3 px-4 py-2.5">
              <span class="font-body text-xs font-semibold text-academic-700 tabular-nums w-36 shrink-0">{{ item.time }}</span>
              <span class="font-body text-sm text-navy-700 break-words">{{ item.activity }}</span>
            </li>
          </ul>
          <h3 class="font-heading text-lg font-bold text-navy-900 mb-3">{{ t('workshopsPage.chooseHeading') }}</h3>
          <div class="space-y-3">
            <p class="font-body text-sm text-navy-600 leading-relaxed rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">{{ t('workshopsPage.chooseWorkshops') }}</p>
            <p class="font-body text-sm text-navy-600 leading-relaxed rounded-xl border border-academic-200 bg-academic-50/60 px-4 py-3">
              {{ t('workshopsPage.chooseTutoring') }}
              <router-link to="/register" class="font-semibold text-academic-700 hover:text-academic-800 underline underline-offset-2 ms-1">
                {{ t('workshopsPage.tutoringCta') }}
              </router-link>
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Final CTA -->
  <section ref="finalRef" class="relative py-20 md:py-28 overflow-hidden bg-navy-950">
    <div class="absolute inset-0" style="background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(251,191,36,0.10) 0%, transparent 70%);"></div>
    <div class="relative max-w-3xl mx-auto px-6 md:px-12 text-center">
      <h2
        class="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-6 transition-all duration-1000 ease-out"
        :class="finalVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        {{ t('workshopsPage.finalHeading') }}
      </h2>
      <p
        class="font-body text-lg text-white/70 leading-relaxed max-w-md mx-auto mb-10 transition-all duration-1000 delay-100 ease-out"
        :class="finalVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        {{ t('workshopsPage.finalSubtitle') }}
      </p>
      <div
        class="flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-1000 delay-200 ease-out"
        :class="finalVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        <button
          type="button"
          @click="modalOpen = true"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-amber-400 text-[#001B3D] font-body text-sm font-bold tracking-[0.15em] uppercase hover:bg-amber-300 transition-colors duration-300 shadow-xl shadow-black/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none"
        >
          {{ t('workshopsPage.signupCta') }}
        </button>
        <a
          href="tel:+15046673625"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/20 text-white/80 font-body text-sm font-bold tracking-[0.15em] uppercase hover:border-white/40 hover:text-white transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          {{ t('workshopsPage.callCta') }}
        </a>
      </div>
    </div>
  </section>

  <WorkshopSignupModal v-model:open="modalOpen" />
</template>
