<script setup>
import { useIntersectionReveal } from '../composables/useIntersectionReveal'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()

const { sectionRef: overviewRef, isVisible: overviewVisible } = useIntersectionReveal(0.15)
const { sectionRef: scheduleRef, isVisible: scheduleVisible } = useIntersectionReveal(0.15)
const { sectionRef: workshopsRef, isVisible: workshopsVisible } = useIntersectionReveal(0.15)
const { sectionRef: stemRef, isVisible: stemVisible } = useIntersectionReveal(0.15)
const { sectionRef: lunchRef, isVisible: lunchVisible } = useIntersectionReveal(0.15)
const { sectionRef: finalRef, isVisible: finalVisible } = useIntersectionReveal(0.2)
</script>

<template>
  <!-- Hero Banner -->
  <section class="relative py-28 md:py-36 overflow-hidden bg-[#001B3D]">
    <div class="absolute inset-0" style="background: radial-gradient(ellipse 80% 60% at 50% 20%, rgba(100,160,255,0.15) 0%, transparent 70%);"></div>
    <div class="relative max-w-4xl mx-auto px-6 md:px-12 text-center">
      <div class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500/20 border border-amber-400/30 mb-6">
        <div class="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
        <span class="font-body text-[10px] tracking-[0.3em] uppercase text-amber-300 font-bold">{{ t('summerCamp.heroBadge') }}</span>
      </div>
      <h1 class="font-heading text-4xl md:text-5xl lg:text-6xl text-white font-extrabold tracking-tight leading-tight mb-4">
        {{ t('summerCamp.heroHeading') }} <span class="gradient-text-light">{{ t('summerCamp.heroHighlight') }}</span>
      </h1>
      <p class="font-body text-base md:text-lg text-white/80 font-medium mb-3">
        {{ t('summerCamp.heroDate') }}
      </p>
      <p class="font-body text-lg md:text-xl text-white/70 font-normal max-w-lg mx-auto leading-relaxed mb-10">
        {{ t('summerCamp.heroSubtitle') }}
      </p>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <a
          href="tel:+15043739778"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-[#001B3D] font-body text-sm font-bold tracking-[0.15em] uppercase hover:bg-white/90 transition-colors duration-300 shadow-xl shadow-black/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          {{ t('summerCamp.callCta') }}
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

  <!-- Overview -->
  <section ref="overviewRef" class="relative py-20 md:py-28 overflow-hidden">
    <div class="max-w-6xl mx-auto px-6 md:px-12">
      <div class="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div
          class="order-2 md:order-1 transition-all duration-1000 ease-out"
          :class="overviewVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-navy-50 border border-navy-100 mb-6">
            <div class="w-1.5 h-1.5 rounded-full bg-academic-500"></div>
            <span class="font-body text-[10px] tracking-[0.3em] uppercase text-navy-600 font-bold">{{ t('summerCamp.overviewBadge') }}</span>
          </div>
          <h2 class="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#001B3D] tracking-tight mb-6">
            {{ t('summerCamp.overviewHeading') }}
          </h2>
          <div class="space-y-4 font-body text-navy-500 leading-relaxed">
            <p>{{ t('summerCamp.overviewP1') }}</p>
            <p>{{ t('summerCamp.overviewP2') }}</p>
          </div>
        </div>
        <div
          class="order-1 md:order-2 transition-all duration-1000 delay-200 ease-out"
          :class="overviewVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <div class="rounded-2xl overflow-hidden shadow-xl shadow-navy-900/10 border border-navy-100 bg-white">
            <img
              src="/summer-camp-2026.jpg"
              alt="SAHA Summer Camp & STEM 2026 main flyer"
              width="532"
              height="751"
              class="w-full h-auto"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Daily Schedule -->
  <section ref="scheduleRef" class="relative py-20 md:py-28 overflow-hidden bg-navy-50/40">
    <div class="max-w-6xl mx-auto px-6 md:px-12">
      <div class="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div
          class="transition-all duration-1000 ease-out"
          :class="scheduleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <div class="rounded-2xl overflow-hidden shadow-xl shadow-navy-900/10 border border-navy-100 bg-white">
            <img
              src="/summer-camp/daily-schedule.jpg"
              alt="Daily camp schedule with morning, midday, and afternoon STEM block"
              width="900"
              height="1350"
              class="w-full h-auto"
              loading="lazy"
            />
          </div>
        </div>
        <div
          class="transition-all duration-1000 delay-200 ease-out"
          :class="scheduleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-navy-50 border border-navy-100 mb-6">
            <div class="w-1.5 h-1.5 rounded-full bg-academic-500"></div>
            <span class="font-body text-[10px] tracking-[0.3em] uppercase text-navy-600 font-bold">{{ t('summerCamp.scheduleBadge') }}</span>
          </div>
          <h2 class="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#001B3D] tracking-tight mb-6">
            {{ t('summerCamp.scheduleHeading') }}
          </h2>
          <div class="space-y-4 font-body text-navy-500 leading-relaxed">
            <p>{{ t('summerCamp.scheduleP1') }}</p>
            <p>{{ t('summerCamp.scheduleP2') }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Workshops -->
  <section ref="workshopsRef" class="relative py-20 md:py-28 overflow-hidden">
    <div class="max-w-6xl mx-auto px-6 md:px-12">
      <div class="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div
          class="order-2 md:order-1 transition-all duration-1000 ease-out"
          :class="workshopsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-navy-50 border border-navy-100 mb-6">
            <div class="w-1.5 h-1.5 rounded-full bg-academic-500"></div>
            <span class="font-body text-[10px] tracking-[0.3em] uppercase text-navy-600 font-bold">{{ t('summerCamp.workshopsBadge') }}</span>
          </div>
          <h2 class="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#001B3D] tracking-tight mb-6">
            {{ t('summerCamp.workshopsHeading') }}
          </h2>
          <div class="space-y-4 font-body text-navy-500 leading-relaxed">
            <p>{{ t('summerCamp.workshopsP1') }}</p>
            <p>{{ t('summerCamp.workshopsP2') }}</p>
          </div>
        </div>
        <div
          class="order-1 md:order-2 transition-all duration-1000 delay-200 ease-out flex justify-center"
          :class="workshopsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <div class="rounded-2xl overflow-hidden shadow-xl shadow-navy-900/10 border border-navy-100 bg-white max-w-sm">
            <img
              src="/summer-camp/workshops-note.jpg"
              alt="Workshops information note"
              width="279"
              height="356"
              class="w-full h-auto"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- STEM Block -->
  <section ref="stemRef" class="relative py-20 md:py-28 overflow-hidden bg-[#001B3D]">
    <div class="absolute inset-0" style="background: radial-gradient(ellipse 80% 60% at 50% 30%, rgba(74,154,204,0.1) 0%, transparent 70%);"></div>
    <div class="relative max-w-6xl mx-auto px-6 md:px-12">
      <div class="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div
          class="transition-all duration-1000 ease-out"
          :class="stemVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <div class="rounded-2xl overflow-hidden shadow-2xl shadow-black/40 border border-white/10">
            <img
              src="/summer-camp/stem-flyer.jpg"
              alt="STEM 2026 flyer with dates, dress code, pricing, and contact info"
              width="900"
              height="1350"
              class="w-full h-auto"
              loading="lazy"
            />
          </div>
        </div>
        <div
          class="transition-all duration-1000 delay-200 ease-out"
          :class="stemVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] mb-6">
            <div class="w-1.5 h-1.5 rounded-full bg-academic-400"></div>
            <span class="font-body text-[10px] tracking-[0.3em] uppercase text-white/70 font-bold">{{ t('summerCamp.stemBadge') }}</span>
          </div>
          <h2 class="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-6">
            {{ t('summerCamp.stemHeading') }}
          </h2>
          <div class="space-y-4 font-body text-white/70 leading-relaxed mb-6">
            <p>{{ t('summerCamp.stemP1') }}</p>
            <p>{{ t('summerCamp.stemP2') }}</p>
          </div>
          <p class="font-body text-sm text-academic-300 font-semibold">
            {{ t('summerCamp.stemCoordinator') }}
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Lunch Menus -->
  <section ref="lunchRef" class="relative py-20 md:py-28 overflow-hidden">
    <div class="max-w-6xl mx-auto px-6 md:px-12">
      <div
        class="text-center max-w-2xl mx-auto mb-14 transition-all duration-1000 ease-out"
        :class="lunchVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
      >
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-navy-50 border border-navy-100 mb-6">
          <div class="w-1.5 h-1.5 rounded-full bg-academic-500"></div>
          <span class="font-body text-[10px] tracking-[0.3em] uppercase text-navy-600 font-bold">{{ t('summerCamp.lunchBadge') }}</span>
        </div>
        <h2 class="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#001B3D] tracking-tight mb-6">
          {{ t('summerCamp.lunchHeading') }}
        </h2>
        <div class="space-y-4 font-body text-navy-500 leading-relaxed">
          <p>{{ t('summerCamp.lunchP1') }}</p>
          <p>{{ t('summerCamp.lunchP2') }}</p>
        </div>
      </div>
      <div
        class="grid sm:grid-cols-2 gap-6 md:gap-10 max-w-3xl mx-auto transition-all duration-1000 delay-200 ease-out"
        :class="lunchVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
      >
        <div>
          <p class="text-center font-body text-xs tracking-[0.2em] uppercase text-navy-500 font-bold mb-3">
            {{ t('summerCamp.lunchWeekA') }}
          </p>
          <div class="rounded-2xl overflow-hidden shadow-xl shadow-navy-900/10 border border-navy-100 bg-white">
            <img
              src="/summer-camp/lunch-week-a.jpg"
              alt="Week A lunch menu, Monday through Friday"
              width="396"
              height="458"
              class="w-full h-auto"
              loading="lazy"
            />
          </div>
        </div>
        <div>
          <p class="text-center font-body text-xs tracking-[0.2em] uppercase text-navy-500 font-bold mb-3">
            {{ t('summerCamp.lunchWeekB') }}
          </p>
          <div class="rounded-2xl overflow-hidden shadow-xl shadow-navy-900/10 border border-navy-100 bg-white">
            <img
              src="/summer-camp/lunch-week-b.jpg"
              alt="Week B lunch menu, Monday through Friday"
              width="392"
              height="511"
              class="w-full h-auto"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Final CTA -->
  <section ref="finalRef" class="relative py-20 md:py-28 overflow-hidden bg-navy-950">
    <div class="absolute inset-0" style="background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(74,154,204,0.12) 0%, transparent 70%);"></div>
    <div class="relative max-w-3xl mx-auto px-6 md:px-12 text-center">
      <h2
        class="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-6 transition-all duration-1000 ease-out"
        :class="finalVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        {{ t('summerCamp.finalHeading') }}
      </h2>
      <p
        class="font-body text-lg text-white/70 leading-relaxed max-w-md mx-auto mb-10 transition-all duration-1000 delay-100 ease-out"
        :class="finalVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        {{ t('summerCamp.finalSubtitle') }}
      </p>
      <div
        class="flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-1000 delay-200 ease-out"
        :class="finalVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        <a
          href="tel:+15043739778"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-[#001B3D] font-body text-sm font-bold tracking-[0.15em] uppercase hover:bg-white/90 transition-colors duration-300 shadow-xl shadow-black/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          {{ t('summerCamp.callCta') }}
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
</template>
