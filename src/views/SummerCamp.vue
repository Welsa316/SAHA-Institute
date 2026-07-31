<script setup>
import { computed } from 'vue'
import { useIntersectionReveal } from '../composables/useIntersectionReveal'
import { useI18n } from '../composables/useI18n'
import CampBranchTimeline from '../components/CampBranchTimeline.vue'
import { SUMMER_GALLERIES, SUMMER_DAYS, STEM_GALLERIES, STEM_DAYS } from '../constants/campGallery.js'

const { t } = useI18n()

const { sectionRef: introRef, isVisible: introVisible } = useIntersectionReveal(0.15)
const { sectionRef: finalRef, isVisible: finalVisible } = useIntersectionReveal(0.2)

// Camp 2026 is over: this page is the recap. Enrollment CTAs are gone; the
// flyers are gone; the story is told as a scroll timeline with photo grids.
//
// PHOTOS: both June camera rolls live under public/camp-gallery/ — summer/
// (Summer Camp) and stem/ (STEM Club, no STEM on Fridays). Both programs
// ended at day 15 — the camp's last five planned days were cancelled — so the
// tree runs Day 1–15 with the two branches side by side the whole way.
// Arrays live in src/constants/campGallery.js.
const timelineEntries = computed(() =>
  Array.from({ length: SUMMER_DAYS }, (_, i) => ({
    day: i + 1,
    summer: SUMMER_GALLERIES[`day${i + 1}`] ?? [],
    stem: i < STEM_DAYS ? STEM_GALLERIES[`day${i + 1}`] : null,
  })),
)
</script>

<template>
  <!-- Hero — Summer 2026 wrapped -->
  <section class="relative py-28 md:py-36 overflow-hidden bg-[#001B3D]">
    <div class="absolute inset-0" style="background: radial-gradient(ellipse 80% 60% at 50% 20%, rgba(100,160,255,0.15) 0%, transparent 70%);"></div>
    <div class="relative max-w-4xl mx-auto px-6 md:px-12 text-center">
      <div class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500/20 border border-amber-400/30 mb-6">
        <div class="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
        <span class="font-body text-[10px] tracking-[0.3em] uppercase text-amber-300 font-bold">{{ t('summerCamp.closedBadge') }}</span>
      </div>
      <h1 class="font-heading text-4xl md:text-5xl lg:text-6xl text-white font-extrabold tracking-tight leading-tight mb-4">
        {{ t('summerCamp.heroHeading') }} <span class="gradient-text-light">{{ t('summerCamp.heroHighlight') }}</span>
      </h1>
      <p class="font-body text-base md:text-lg text-white/80 font-medium mb-3">
        {{ t('summerCamp.heroDate') }}
      </p>
      <p class="font-body text-lg md:text-xl text-white/70 font-normal max-w-lg mx-auto leading-relaxed mb-10">
        {{ t('summerCamp.recapSubtitle') }}
      </p>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <a
          href="tel:+15043739778"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-[#001B3D] font-body text-sm font-bold tracking-[0.15em] uppercase hover:bg-white/90 transition-colors duration-300 shadow-xl shadow-black/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          {{ t('summerCamp.askCta') }}
        </a>
        <router-link
          to="/contact"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/20 text-white/80 font-body text-sm font-bold tracking-[0.15em] uppercase hover:border-white/40 hover:text-white transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none"
        >
          {{ t('summerCamp.contactCta') }}
        </router-link>
      </div>
    </div>
  </section>

  <!-- Recap intro -->
  <section ref="introRef" class="relative pt-20 md:pt-28 pb-4 overflow-hidden">
    <div
      class="max-w-6xl mx-auto px-6 md:px-12 transition-all duration-1000 ease-out"
      :class="introVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
    >
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-navy-50 border border-navy-100 mb-6">
        <div class="w-1.5 h-1.5 rounded-full bg-academic-500"></div>
        <span class="font-body text-[10px] tracking-[0.3em] uppercase text-navy-600 font-bold">{{ t('summerCamp.recapBadge') }}</span>
      </div>
      <h2 class="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#001B3D] tracking-tight mb-5 max-w-3xl">
        {{ t('summerCamp.recapHeading') }}
      </h2>
      <p class="font-body text-navy-500 leading-relaxed max-w-xl">
        {{ t('summerCamp.recapIntro') }}
      </p>
    </div>
  </section>

  <!-- The daily rhythm — the recap facts that aren't tied to any one week:
       what a camp day looked like, the menus, and the STEM note. -->
  <section class="relative py-14 md:py-20 overflow-hidden">
    <div class="max-w-6xl mx-auto px-6 md:px-12">
      <h2 class="font-heading text-2xl md:text-3xl font-extrabold text-[#001B3D] tracking-tight mb-4">
        {{ t('summerCamp.dailyHeading') }}
      </h2>
      <div class="space-y-3 font-body text-navy-500 leading-relaxed max-w-2xl mb-10">
        <p>{{ t('summerCamp.scheduleP1') }}</p>
        <p>{{ t('summerCamp.scheduleP2') }}</p>
      </div>
      <div class="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
        <div>
          <p class="font-body text-[10px] tracking-[0.2em] uppercase text-navy-500 font-bold mb-3">{{ t('summerCamp.scheduleListLabel') }}</p>
          <ul class="rounded-xl border border-navy-100 bg-white/70 divide-y divide-navy-100 overflow-hidden">
            <li v-for="item in t('summerCamp.scheduleItems')" :key="item.time" class="flex items-baseline gap-3 px-4 py-2.5">
              <span class="font-body text-xs font-semibold text-academic-700 tabular-nums w-36 shrink-0">{{ item.time }}</span>
              <span class="font-body text-sm text-navy-700 break-words">{{ item.activity }}</span>
            </li>
          </ul>
          <p class="font-body text-sm font-semibold text-academic-700 mt-4">{{ t('summerCamp.stemContinues') }}</p>
          <p class="font-body text-sm font-semibold text-academic-700 mt-1">{{ t('summerCamp.stemCoordinator') }}</p>
        </div>
        <div>
          <p class="font-body text-[10px] tracking-[0.2em] uppercase text-navy-500 font-bold mb-3">{{ t('summerCamp.lunchHeading') }}</p>
          <div class="grid sm:grid-cols-2 gap-6">
            <div>
              <p class="font-body text-xs tracking-[0.2em] uppercase text-navy-500 font-bold mb-2">{{ t('summerCamp.lunchWeekA') }}</p>
              <ul class="space-y-1.5">
                <li v-for="m in t('summerCamp.lunchWeekAItems')" :key="m.day" class="flex justify-between gap-3 font-body text-sm">
                  <span class="text-navy-500 font-semibold">{{ m.day }}</span>
                  <span class="text-navy-700 text-end break-words">{{ m.meal }}</span>
                </li>
              </ul>
            </div>
            <div>
              <p class="font-body text-xs tracking-[0.2em] uppercase text-navy-500 font-bold mb-2">{{ t('summerCamp.lunchWeekB') }}</p>
              <ul class="space-y-1.5">
                <li v-for="m in t('summerCamp.lunchWeekBItems')" :key="m.day" class="flex justify-between gap-3 font-body text-sm">
                  <span class="text-navy-500 font-semibold">{{ m.day }}</span>
                  <span class="text-navy-700 text-end break-words">{{ m.meal }}</span>
                </li>
              </ul>
            </div>
          </div>
          <p class="font-body text-sm text-navy-500 leading-relaxed mt-4">{{ t('summerCamp.lunchP1') }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- June highlights — transcribed from the "June: done!" flyer -->
  <section class="relative pb-4 overflow-hidden">
    <div class="max-w-6xl mx-auto px-6 md:px-12">
      <h2 class="font-heading text-2xl md:text-3xl font-extrabold text-[#001B3D] tracking-tight mb-8">
        {{ t('summerCamp.juneHeading') }}
      </h2>
      <div class="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
        <div class="rounded-2xl border border-navy-100 bg-white shadow-sm p-6">
          <p class="font-body text-[10px] tracking-[0.2em] uppercase text-navy-500 font-bold mb-4">{{ t('summerCamp.juneProgramLabel') }}</p>
          <ul class="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            <li v-for="item in t('summerCamp.juneProgramItems')" :key="item" class="flex items-start gap-2 font-body text-sm text-navy-700">
              <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden="true"></span>
              {{ item }}
            </li>
          </ul>
        </div>
        <div class="rounded-2xl border border-navy-100 bg-white shadow-sm p-6">
          <p class="font-body text-[10px] tracking-[0.2em] uppercase text-navy-500 font-bold mb-4">{{ t('summerCamp.juneStemLabel') }}</p>
          <ul class="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            <li v-for="item in t('summerCamp.juneStemItems')" :key="item" class="flex items-start gap-2 font-body text-sm text-navy-700">
              <svg class="mt-0.5 w-4 h-4 text-academic-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              {{ item }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- The month, day by day — Summer Camp and STEM Club branching off one trunk -->
  <CampBranchTimeline :entries="timelineEntries" :stem-days="STEM_DAYS" />

  <!-- Final CTA — next summer + year-round tutoring -->
  <section ref="finalRef" class="relative py-20 md:py-28 overflow-hidden bg-navy-950">
    <div class="absolute inset-0" style="background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(74,154,204,0.12) 0%, transparent 70%);"></div>
    <div class="relative max-w-3xl mx-auto px-6 md:px-12 text-center">
      <h2
        class="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-6 transition-all duration-1000 ease-out"
        :class="finalVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        {{ t('summerCamp.finalHeadingClosed') }}
      </h2>
      <p
        class="font-body text-lg text-white/70 leading-relaxed max-w-md mx-auto mb-10 transition-all duration-1000 delay-100 ease-out"
        :class="finalVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        {{ t('summerCamp.finalSubtitleClosed') }}
      </p>
      <div
        class="flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-1000 delay-200 ease-out"
        :class="finalVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        <router-link
          to="/register"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-[#001B3D] font-body text-sm font-bold tracking-[0.15em] uppercase hover:bg-white/90 transition-colors duration-300 shadow-xl shadow-black/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none"
        >
          {{ t('summerCamp.registerCta') }}
        </router-link>
        <a
          href="tel:+15043739778"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/20 text-white/80 font-body text-sm font-bold tracking-[0.15em] uppercase hover:border-white/40 hover:text-white transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          {{ t('summerCamp.askCta') }}
        </a>
      </div>
    </div>
  </section>
</template>
