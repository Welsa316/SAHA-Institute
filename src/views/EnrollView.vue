<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useIntersectionReveal } from '../composables/useIntersectionReveal'
import ShinyButton from '../components/ShinyButton.vue'
import WorkshopSignupModal from '../components/WorkshopSignupModal.vue'

// The "Summer Signups" hub. Two paths a parent might take:
//   1. Workshops — actual online form. Big amber CTA opens the form in an
//      animated modal so the parent never leaves the context of "what am I
//      signing up for." Surfaced first because it's the only online path.
//   2. Summer Camp & STEM — manual signup over the phone. Tel: CTA + a
//      "See full details" link to the long-form /summer-camp page.
//
// Sections alternate dark / light / dark for visual rhythm:
//   Hero (navy) -> Workshops (slate->white) -> Summer Camp (navy)

const { t } = useI18n()
const route = useRoute()

const modalOpen = ref(false)

const { sectionRef: workshopsRef, isVisible: workshopsVisible } = useIntersectionReveal(0.15)
const { sectionRef: summerRef, isVisible: summerVisible } = useIntersectionReveal(0.15)

function openWorkshops() {
  modalOpen.value = true
}

onMounted(() => {
  // /signup redirects here. Keep the polite UX of auto-opening the modal so
  // anyone with the old bookmark still lands in the form, not just on a page
  // with a button to find it.
  if (route.query.signup !== undefined) {
    modalOpen.value = true
  }
})
</script>

<template>
  <main>
    <!-- Hero -->
    <section class="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-[#001B3D]">
      <div class="absolute inset-0" style="background: radial-gradient(ellipse 80% 60% at 50% 20%, rgba(100,160,255,0.18) 0%, transparent 70%);"></div>
      <div class="relative max-w-4xl mx-auto px-6 md:px-12 text-center">
        <div class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500/15 border border-amber-400/30 mb-6">
          <div class="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
          <span class="font-body text-[10px] tracking-[0.3em] uppercase text-amber-200 font-bold">{{ t('enroll.heroBadge') }}</span>
        </div>
        <h1 class="font-heading text-4xl md:text-5xl lg:text-6xl text-white font-extrabold tracking-tight leading-tight mb-5">
          {{ t('enroll.heroHeading') }} <span class="gradient-text-light">{{ t('enroll.heroHighlight') }}</span>
        </h1>
        <p class="font-body text-lg md:text-xl text-white/70 font-normal max-w-2xl mx-auto leading-relaxed">
          {{ t('enroll.heroSubtitle') }}
        </p>
      </div>
    </section>

    <!-- Workshops — surfaced first because it's the actually-online signup. -->
    <section
      ref="workshopsRef"
      class="relative py-20 md:py-28 bg-gradient-to-b from-slate-50 to-white overflow-hidden"
    >
      <!-- Soft amber wash to echo the CTA's color without dominating the panel. -->
      <div class="absolute inset-0 pointer-events-none" style="background: radial-gradient(ellipse 70% 50% at 50% 40%, rgba(251,191,36,0.10) 0%, transparent 70%);"></div>

      <div class="relative max-w-5xl mx-auto px-6 md:px-12 text-center">
        <div
          class="transition-all duration-1000 ease-out"
          :class="workshopsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 mb-5">
            <div class="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
            <span class="font-body text-[10px] tracking-[0.3em] uppercase text-amber-700 font-bold">{{ t('enroll.workshopsBadge') }}</span>
          </div>

          <h2 class="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-navy-900 tracking-tight mb-5 leading-tight">
            {{ t('enroll.workshopsHeading1') }} <span class="gradient-text">{{ t('enroll.workshopsHeading2') }}</span>
          </h2>

          <p class="font-body text-navy-600 text-lg max-w-2xl mx-auto leading-relaxed mb-10">
            {{ t('enroll.workshopsDescription') }}
          </p>

          <!-- Highlights row — light cards on a light surface, with amber accents
               on the numeric values so the row reads as "this is the same energy
               as the amber CTA below." -->
          <div class="grid sm:grid-cols-3 gap-4 md:gap-6 max-w-3xl mx-auto mb-12">
            <div class="rounded-2xl bg-white border border-navy-100 shadow-sm px-5 py-5 text-left">
              <p class="font-heading text-2xl font-bold text-amber-600 mb-1">{{ t('enroll.workshopsHighlight1Value') }}</p>
              <p class="font-body text-xs uppercase tracking-wider text-navy-500">{{ t('enroll.workshopsHighlight1Label') }}</p>
            </div>
            <div class="rounded-2xl bg-white border border-navy-100 shadow-sm px-5 py-5 text-left">
              <p class="font-heading text-2xl font-bold text-amber-600 mb-1">{{ t('enroll.workshopsHighlight2Value') }}</p>
              <p class="font-body text-xs uppercase tracking-wider text-navy-500">{{ t('enroll.workshopsHighlight2Label') }}</p>
            </div>
            <div class="rounded-2xl bg-white border border-navy-100 shadow-sm px-5 py-5 text-left">
              <p class="font-heading text-2xl font-bold text-amber-600 mb-1">{{ t('enroll.workshopsHighlight3Value') }}</p>
              <p class="font-body text-xs uppercase tracking-wider text-navy-500">{{ t('enroll.workshopsHighlight3Label') }}</p>
            </div>
          </div>

          <!-- The big CTA. Opens the form in an animated modal. -->
          <ShinyButton size="lg" :label="t('enroll.workshopsCta')" @click="(e) => { e.preventDefault(); openWorkshops() }" />
          <p class="mt-4 font-body text-xs text-navy-400">{{ t('enroll.workshopsCtaHint') }}</p>
        </div>
      </div>
    </section>

    <!-- Summer Camp & STEM — dark panel with the flyer image. Phone-only signup. -->
    <section
      ref="summerRef"
      class="relative py-20 md:py-28 overflow-hidden bg-[#001B3D]"
    >
      <div class="absolute inset-0" style="background: radial-gradient(ellipse 80% 60% at 50% 50%, rgba(74,154,204,0.10) 0%, transparent 70%);"></div>

      <div class="relative max-w-6xl mx-auto px-6 md:px-12">
        <div class="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <!-- Flyer -->
          <div
            class="transition-all duration-1000 ease-out"
            :class="summerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
          >
            <div class="rounded-2xl overflow-hidden shadow-2xl shadow-black/30 border border-white/10">
              <picture>
                <source srcset="/summer-camp-2026.webp" type="image/webp" />
                <img
                  src="/summer-camp-2026.jpg"
                  :alt="t('enroll.summerImageAlt')"
                  width="532"
                  height="751"
                  class="w-full h-auto"
                  loading="lazy"
                />
              </picture>
            </div>
          </div>

          <!-- Copy + CTAs -->
          <div
            class="transition-all duration-1000 delay-200 ease-out"
            :class="summerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
          >
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 mb-5">
              <div class="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
              <span class="font-body text-[10px] tracking-[0.3em] uppercase text-amber-300 font-bold">{{ t('enroll.summerBadge') }}</span>
            </div>

            <h2 class="font-heading text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4 leading-tight">
              {{ t('enroll.summerHeading1') }}<br/><span class="gradient-text-light">{{ t('enroll.summerHeading2') }}</span>
            </h2>

            <p class="font-body text-white/70 mb-7 leading-relaxed">
              {{ t('enroll.summerDescription') }}
            </p>

            <!-- Key details -->
            <div class="space-y-3 mb-8">
              <div class="flex items-center gap-3">
                <svg class="w-5 h-5 text-academic-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <span class="font-body text-sm text-white/80">{{ t('enroll.summerDate') }}</span>
              </div>
              <div class="flex items-center gap-3">
                <svg class="w-5 h-5 text-academic-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="font-body text-sm text-white/80">{{ t('enroll.summerSchedule') }}</span>
              </div>
              <div class="flex items-center gap-3">
                <svg class="w-5 h-5 text-academic-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
                <span class="font-body text-sm text-white/80">{{ t('enroll.summerPricing') }}</span>
              </div>
            </div>

            <!-- White pill against navy — high contrast, matches the dark-section
                 CTA pattern from the old homepage Events block. -->
            <div class="flex flex-wrap items-center gap-4">
              <a
                href="tel:+15043739778"
                class="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-[#001B3D] font-body text-sm font-bold tracking-[0.15em] uppercase hover:bg-white/90 transition-colors duration-300 shadow-xl shadow-black/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {{ t('enroll.summerCallCta') }}
              </a>
              <router-link
                to="/summer-camp"
                class="inline-flex items-center gap-2 font-body text-sm font-semibold text-white/80 hover:text-white transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none rounded-md"
              >
                {{ t('enroll.summerDetailsCta') }}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </section>

    <WorkshopSignupModal v-model:open="modalOpen" />
  </main>
</template>
