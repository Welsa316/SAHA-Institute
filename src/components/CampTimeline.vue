<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

// Scroll-driven timeline (Vue adaptation of the Aceternity/21st.dev pattern —
// no framer-motion; a rAF-throttled scroll listener drives the rail fill).
// Each entry gets a sticky oversized chapter title on md+ and a content slot
// named after its id. The vertical rail sits on the left; a gradient fill
// grows as the reader scrolls through the chapters.
//
// SSG-safe: all window access lives in onMounted (this route is prerendered).

const props = defineProps({
  // [{ id: 'mornings', title: 'Mornings' }, …]
  entries: { type: Array, required: true },
})

const containerRef = ref(null)
const entriesRef = ref(null)
const railHeight = ref(0)
const fillPx = ref(0)
const fillOpacity = ref(0)

let rafId = 0

function measure() {
  railHeight.value = entriesRef.value ? entriesRef.value.offsetHeight : 0
}

function update() {
  rafId = 0
  const el = containerRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const vh = window.innerHeight
  // Mirrors the source's useScroll offset ["start 10%", "end 50%"]:
  // 0 when the timeline's top reaches 10% down the viewport,
  // 1 when its bottom reaches the viewport's midpoint.
  const denom = rect.height - vh * 0.4
  const p = denom > 0 ? Math.min(Math.max((vh * 0.1 - rect.top) / denom, 0), 1) : 0
  fillPx.value = p * railHeight.value
  fillOpacity.value = Math.min(p * 10, 1)
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
</script>

<template>
  <div ref="containerRef" class="w-full">
    <div ref="entriesRef" class="relative max-w-6xl mx-auto pb-16 md:pb-24">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="flex justify-start pt-12 md:pt-28 md:gap-10"
      >
        <!-- sticky chapter marker: dot + oversized ghost title (md+) -->
        <div class="sticky flex flex-col md:flex-row z-20 items-center top-28 self-start max-w-xs lg:max-w-sm md:w-full">
          <div class="h-10 w-10 absolute left-3 rounded-full bg-white flex items-center justify-center shadow-sm border border-navy-100">
            <div class="h-3.5 w-3.5 rounded-full bg-academic-100 border border-academic-300"></div>
          </div>
          <h3 class="hidden md:block font-heading text-xl md:pl-20 md:text-5xl font-extrabold text-navy-200">
            {{ entry.title }}
          </h3>
        </div>

        <!-- chapter content -->
        <div class="relative pl-20 pr-4 md:pl-4 w-full">
          <h3 class="md:hidden block font-heading text-2xl mb-4 text-left font-extrabold text-navy-300">
            {{ entry.title }}
          </h3>
          <slot :name="entry.id"></slot>
        </div>
      </div>

      <!-- rail: soft track + scroll-driven gradient fill -->
      <div
        :style="{ height: railHeight + 'px' }"
        class="absolute left-8 top-0 overflow-hidden w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-navy-100 to-transparent to-[99%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]"
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
