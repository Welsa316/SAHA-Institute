<script setup>
import { computed, ref } from 'vue'
import { useIntersectionReveal } from '../composables/useIntersectionReveal'
import { useI18n } from '../composables/useI18n'

// FAQ block modeled on the reference layout the client liked: question bars on
// the left, and — instead of a decorative photo — the ACTIVE question's answer
// fills the right-hand panel on desktop. On mobile the answer expands inline
// under its question (classic accordion) and the panel is hidden.
//
// A11y note: the inline answer element is the canonical disclosure target
// (aria-controls). On md+ it stays in the accessibility tree via `md:sr-only`
// while the visual panel — a duplicate — is aria-hidden.

const { sectionRef, isVisible } = useIntersectionReveal(0.15)
const { t, locale } = useI18n()

const items = computed(() => t('faq.items'))

// First question open by default so the desktop panel is never empty on load.
const active = ref(0)

function toggle(i) {
  active.value = active.value === i ? null : i
}

const activeItem = computed(() => (active.value === null ? null : items.value[active.value]))
</script>

<template>
  <section id="faq" ref="sectionRef" class="relative py-28 md:py-36 bg-white overflow-hidden">
    <div class="relative max-w-6xl mx-auto px-6 md:px-12">
      <!-- Heading -->
      <div class="text-center mb-12 md:mb-16">
        <div
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-navy-50/60 border border-navy-100 mb-6 transition-all duration-700 ease-out motion-reduce:transition-none"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
        >
          <div class="w-1.5 h-1.5 rounded-full bg-academic-500"></div>
          <span class="font-body text-[10px] tracking-[0.3em] uppercase text-navy-600 font-bold">{{ t('faq.badge') }}</span>
        </div>
        <h2
          class="font-heading text-4xl md:text-5xl lg:text-6xl text-[#001B3D] font-extrabold tracking-tight transition-all duration-700 delay-100 ease-out motion-reduce:transition-none"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
        >
          {{ t('faq.heading1') }}
          <span
            v-if="locale === 'en'"
            class="block italic font-bold text-[#001B3D]"
            style="font-family: 'Cormorant Garamond', serif;"
          >{{ t('faq.heading2') }}</span>
          <span v-else class="block">{{ t('faq.heading2') }}</span>
        </h2>
      </div>

      <div
        class="grid md:grid-cols-2 gap-6 lg:gap-10 items-start transition-all duration-700 delay-200 ease-out motion-reduce:transition-none"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        <!-- Left: contact chip + question bars -->
        <div>
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-navy-50/40 border border-navy-100 px-5 py-4 mb-5">
            <div class="min-w-0">
              <p class="font-body text-[11px] uppercase tracking-wider text-navy-400 font-bold">{{ t('faq.emailLabel') }}</p>
              <p class="font-body text-sm font-semibold text-navy-800 break-all" dir="ltr">{{ t('faq.email') }}</p>
            </div>
            <RouterLink
              to="/contact"
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#001B3D] text-white font-body text-xs font-bold tracking-wider uppercase hover:bg-navy-800 transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              {{ t('faq.cta') }}
            </RouterLink>
          </div>

          <ul class="space-y-3">
            <li v-for="(item, i) in items" :key="i">
              <div
                class="rounded-2xl border transition-colors motion-reduce:transition-none"
                :class="active === i ? 'bg-white border-academic-200 shadow-sm' : 'bg-navy-50/40 border-navy-100'"
              >
                <button
                  type="button"
                  @click="toggle(i)"
                  :aria-expanded="active === i"
                  :aria-controls="`faq-answer-${i}`"
                  class="w-full flex items-center justify-between gap-4 px-5 py-4 text-start focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-academic-500 focus:outline-none rounded-2xl"
                >
                  <span class="font-body text-sm md:text-[15px] font-semibold text-navy-800">{{ item.q }}</span>
                  <span
                    class="shrink-0 w-8 h-8 rounded-full bg-[#001B3D] text-white flex items-center justify-center transition-transform duration-300 motion-reduce:transition-none"
                    :class="active === i ? 'rotate-45' : ''"
                    aria-hidden="true"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </span>
                </button>
                <!-- Inline answer: visible expansion on mobile, sr-only on md+
                     (the visual answer lives in the right panel there).
                     grid-rows 0fr→1fr animates the height to its natural size —
                     the CSS trick that lets "auto height" transition smoothly. -->
                <div
                  :id="`faq-answer-${i}`"
                  class="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none md:sr-only"
                  :class="active === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
                >
                  <div class="overflow-hidden">
                    <p
                      class="px-5 pb-5 font-body text-sm text-navy-500 leading-relaxed transition-opacity duration-300 ease-out motion-reduce:transition-none"
                      :class="active === i ? 'opacity-100 delay-100' : 'opacity-0'"
                    >{{ item.a }}</p>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <!-- Right: active answer panel (desktop only; duplicate of the inline
             answer, so hidden from assistive tech). -->
        <div class="hidden md:block md:sticky md:top-28" aria-hidden="true">
          <div class="rounded-3xl bg-[#001B3D] text-white p-8 lg:p-10 min-h-[340px] flex flex-col overflow-hidden">
            <!-- out-in swap: the old answer slips up and fades, the new one
                 rises in — content moves over a stable navy card, never the
                 card itself. -->
            <Transition
              mode="out-in"
              enter-active-class="transition-all duration-300 ease-out motion-reduce:transition-none"
              enter-from-class="opacity-0 translate-y-4"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition-all duration-150 ease-in motion-reduce:transition-none"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-2"
            >
              <div v-if="activeItem" :key="active" class="flex flex-col flex-1">
                <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-6">
                  <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <h3 class="font-heading text-2xl font-bold tracking-tight mb-4">{{ activeItem.q }}</h3>
                <p class="font-body text-[15px] leading-relaxed text-white/80">{{ activeItem.a }}</p>
              </div>
              <div v-else key="hint" class="m-auto text-center">
                <p class="font-body text-sm text-white/60">{{ t('faq.panelHint') }}</p>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
