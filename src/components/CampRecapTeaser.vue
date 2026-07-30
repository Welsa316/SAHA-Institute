<script setup>
import { useIntersectionReveal } from '../composables/useIntersectionReveal'
import { useI18n } from '../composables/useI18n'
import CampGalleryGrid from './CampGalleryGrid.vue'
import { SUMMER_GALLERIES, STEM_GALLERIES } from '../constants/campGallery.js'

// Home-page teaser for the June 2026 recap: a compact photo strip that gives
// every visitor the visual hook and one click through to the full two-branch
// timeline on /summer-camp. Two Summer Camp + two STEM Club highlights.

const { t } = useI18n()
const { sectionRef, isVisible } = useIntersectionReveal(0.15)

const photos = [
  SUMMER_GALLERIES.day2[0],
  STEM_GALLERIES.day6[0],
  SUMMER_GALLERIES.day7[0],
  STEM_GALLERIES.day11[0],
]
</script>

<template>
  <section ref="sectionRef" class="relative py-20 md:py-28 overflow-hidden bg-navy-50/40">
    <div class="max-w-6xl mx-auto px-6 md:px-12">
      <div class="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div
          class="transition-all duration-1000 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 mb-6">
            <div class="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
            <span class="font-body text-[10px] tracking-[0.3em] uppercase text-amber-700 font-bold">{{ t('campRecap.badge') }}</span>
          </div>
          <h2 class="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#001B3D] tracking-tight mb-5">
            {{ t('campRecap.heading') }}
          </h2>
          <p class="font-body text-navy-500 leading-relaxed mb-8 max-w-md">
            {{ t('campRecap.subtitle') }}
          </p>
          <router-link
            to="/summer-camp"
            class="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#001B3D] text-white font-body text-sm font-bold tracking-[0.15em] uppercase hover:bg-navy-800 transition-colors duration-300 shadow-lg shadow-navy-900/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-600 focus:outline-none"
          >
            {{ t('campRecap.cta') }}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </router-link>
        </div>
        <div
          class="transition-all duration-1000 delay-200 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <CampGalleryGrid :photos="photos" :placeholder-count="4" compact />
        </div>
      </div>
    </div>
  </section>
</template>
