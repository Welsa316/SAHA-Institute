<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from '../composables/useI18n'
import CampGalleryGrid from './CampGalleryGrid.vue'

// Two-branch June recap timeline — a "stem and leaf" tree, as the client
// pitched it: one central trunk, Summer Camp branching off one side and STEM
// Club off the other, day by day. STEM ran Mon–Thu only, so its branch ends at
// day `stemDays` with a wrapped marker while Summer Camp keeps going to day 20.
//
// Desktop: [summer | trunk | stem] grid, day node on the trunk, a thin cross
// bar behind each node hinting at the branches. Mobile: the trunk moves to the
// left rail and each day stacks its two labeled galleries.
//
// The rail fill reuses CampTimeline's scroll math (rAF-throttled, SSG-safe);
// day nodes light up as the fill passes them.

const props = defineProps({
  // [{ day: 1, summer: [photos], stem: [photos] | null }, …] — stem null past stemDays
  entries: { type: Array, required: true },
  stemDays: { type: Number, required: true },
})

const { t } = useI18n()

const containerRef = ref(null)
const entriesRef = ref(null)
const railHeight = ref(0)
const fillPx = ref(0)
const fillOpacity = ref(0)
const litCount = ref(0)

let rafId = 0
let nodeOffsets = []

function measure() {
  const wrap = entriesRef.value
  if (!wrap) return
  railHeight.value = wrap.offsetHeight
  const wrapTop = wrap.getBoundingClientRect().top
  // Only the visible marker per row (md node OR mobile marker) has a layout box.
  nodeOffsets = [...wrap.querySelectorAll('[data-day-node]')]
    .filter((el) => el.offsetParent !== null)
    .map((el) => el.getBoundingClientRect().top - wrapTop)
    .sort((a, b) => a - b)
}

function update() {
  rafId = 0
  const el = containerRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const vh = window.innerHeight
  // 0 when the timeline's top hits 10% down the viewport, 1 when its bottom
  // reaches the viewport midpoint (ported from the Aceternity useScroll offsets).
  const denom = rect.height - vh * 0.4
  const p = denom > 0 ? Math.min(Math.max((vh * 0.1 - rect.top) / denom, 0), 1) : 0
  fillPx.value = p * railHeight.value
  fillOpacity.value = Math.min(p * 10, 1)
  let lit = 0
  for (const y of nodeOffsets) if (y <= fillPx.value + 28) lit++
  litCount.value = lit
}

function onScrollOrResize() {
  if (!rafId) rafId = requestAnimationFrame(update)
}
function onResize() {
  measure()
  onScrollOrResize()
}

onMounted(() => {
  measure()
  update()
  window.addEventListener('scroll', onScrollOrResize, { passive: true })
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScrollOrResize)
  window.removeEventListener('resize', onResize)
  if (rafId) cancelAnimationFrame(rafId)
})

const summerChip =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800'
const stemChip =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-academic-50 border border-academic-200 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-academic-700'
</script>

<template>
  <div ref="containerRef" class="w-full">
    <!-- Column headers (md+): pinned for the whole scroll so it's never
         ambiguous which branch is which — they ride above the photos. -->
    <div class="hidden md:block sticky top-24 z-30 pointer-events-none">
      <div class="max-w-6xl mx-auto px-6 md:px-12 grid md:grid-cols-[1fr_88px_1fr] items-center py-2">
        <div class="flex justify-center"><span :class="summerChip" class="shadow-md ring-1 ring-white">☀ {{ t('summerCamp.branchSummer') }}</span></div>
        <div></div>
        <div class="flex justify-center"><span :class="stemChip" class="shadow-md ring-1 ring-white">⚙ {{ t('summerCamp.branchStem') }}</span></div>
      </div>
    </div>

    <div ref="entriesRef" class="relative max-w-6xl mx-auto px-6 md:px-12 pb-16 md:pb-24">
      <section
        v-for="(e, i) in entries"
        :key="e.day"
        class="relative md:grid md:grid-cols-[1fr_88px_1fr] md:gap-6 lg:gap-8 py-8 md:py-10"
      >
        <h3 class="sr-only">{{ t('summerCamp.dayLabel') }} {{ e.day }}</h3>

        <!-- Mobile day marker: sticky, so the current day rides along as its
             photos scroll past, then hands off to the next day's marker. -->
        <div class="md:hidden sticky top-24 z-20 mb-4">
          <div class="inline-flex items-center gap-2.5 rounded-full bg-white/95 border shadow-md ps-1.5 pe-4 py-1.5 transition-colors duration-500 motion-reduce:transition-none"
            :class="i < litCount ? 'border-academic-200' : 'border-navy-100'"
          >
            <span
              data-day-node
              class="h-8 w-8 rounded-full flex items-center justify-center font-heading text-sm font-extrabold transition-colors duration-500 motion-reduce:transition-none"
              :class="i < litCount ? 'bg-academic-50 text-academic-700' : 'bg-navy-50 text-navy-300'"
            >{{ e.day }}</span>
            <span class="font-heading text-lg font-extrabold" :class="i < litCount ? 'text-navy-800' : 'text-navy-300'">
              {{ t('summerCamp.dayLabel') }} {{ e.day }}
            </span>
          </div>
        </div>

        <!-- Summer branch -->
        <div class="mb-6 md:mb-0 pl-12 md:pl-0">
          <div class="mb-3"><span :class="summerChip">☀ {{ t('summerCamp.branchSummer') }}</span></div>
          <CampGalleryGrid :photos="e.summer" :placeholder-count="2" />
        </div>

        <!-- Trunk node (md+): sticky within its day, so the number travels down
             the trunk with the reader and is pushed off by the next day. -->
        <div class="hidden md:block relative z-10">
          <div class="md:sticky md:top-40">
            <!-- branch arms: amber toward Summer Camp, blue toward STEM (logical
                 sides, so the colors follow the columns in RTL too) -->
            <div class="absolute top-[34px] start-0 w-1/2 h-[3px] rounded-full bg-gradient-to-l from-amber-200 to-transparent rtl:bg-gradient-to-r" aria-hidden="true"></div>
            <div class="absolute top-[34px] end-0 w-1/2 h-[3px] rounded-full bg-gradient-to-r from-academic-200 to-transparent rtl:bg-gradient-to-l" aria-hidden="true"></div>
            <div class="relative flex flex-col items-center">
              <div
                data-day-node
                class="h-[72px] w-[72px] rounded-full bg-white border-2 ring-4 ring-white shadow-md flex flex-col items-center justify-center transition-all duration-500 motion-reduce:transition-none"
                :class="i < litCount ? 'border-academic-400 scale-105' : 'border-navy-100'"
              >
                <span
                  class="font-body text-[9px] font-bold uppercase tracking-[0.2em] transition-colors duration-500 motion-reduce:transition-none"
                  :class="i < litCount ? 'text-academic-500' : 'text-navy-300'"
                >{{ t('summerCamp.dayLabel') }}</span>
                <span
                  class="font-heading text-2xl font-extrabold leading-none transition-colors duration-500 motion-reduce:transition-none"
                  :class="i < litCount ? 'text-academic-700' : 'text-navy-300'"
                >{{ e.day }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- STEM branch: photos through stemDays, a wrapped cap right after, then air -->
        <div v-if="e.stem" class="pl-12 md:pl-0">
          <div class="mb-3"><span :class="stemChip">⚙ {{ t('summerCamp.branchStem') }}</span></div>
          <CampGalleryGrid :photos="e.stem" :placeholder-count="2" />
        </div>
        <div v-else-if="e.day === stemDays + 1" class="pl-12 md:pl-0 md:flex md:items-start md:justify-center md:pt-3">
          <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-dashed border-navy-200 bg-navy-50/40 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-navy-400">
            <svg class="w-3.5 h-3.5 text-academic-400" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {{ t('summerCamp.stemWrapped') }}
          </span>
        </div>
      </section>

      <!-- Trunk: left rail on mobile, centered on md+. z-0 keeps it BEHIND the
           day nodes (z-10) — it must never draw across the numbers. -->
      <div
        :style="{ height: railHeight + 'px' }"
        class="absolute z-0 top-0 overflow-hidden w-[2px] left-[41px] md:left-1/2 md:-translate-x-1/2 bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-navy-100 to-transparent to-[99%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_6%,black_94%,transparent_100%)]"
        aria-hidden="true"
      >
        <div
          :style="{ height: fillPx + 'px', opacity: fillOpacity }"
          class="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-t from-academic-500 via-academic-400 to-transparent from-[0%] via-[10%] rounded-full"
        ></div>
      </div>
    </div>
  </div>
</template>
