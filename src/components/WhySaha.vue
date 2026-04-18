<script setup>
import { computed } from 'vue'
import { useIntersectionReveal } from '../composables/useIntersectionReveal'
import { useI18n } from '../composables/useI18n'

const { sectionRef, isVisible } = useIntersectionReveal(0.2)
const { t } = useI18n()

const featureMeta = [
  { icon: 'personalized', number: '01', delay: 0 },
  { icon: 'tutors', number: '02', delay: 150 },
  { icon: 'group', number: '03', delay: 300 },
]

const features = computed(() =>
  t('whySaha.features').map((item, i) => ({
    ...item,
    ...featureMeta[i],
  }))
)
</script>

<template>
  <section id="about" ref="sectionRef" class="relative py-28 md:py-36 overflow-hidden bg-navy-950">
    <div class="relative max-w-6xl mx-auto px-6 md:px-12">
      <div class="text-center mb-20">
        <div
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.08] mb-6 transition-all duration-700 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
        >
          <div class="w-1.5 h-1.5 rounded-full bg-academic-400"></div>
          <span class="font-body text-[10px] tracking-[0.3em] uppercase text-white/70 font-bold">{{ t('whySaha.badge') }}</span>
        </div>
        <h2
          class="font-heading text-4xl md:text-5xl lg:text-6xl text-white font-extrabold tracking-tight transition-all duration-700 delay-100 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
        >
          {{ t('whySaha.heading') }} <span class="gradient-text-light">{{ t('whySaha.headingHighlight') }}</span> {{ t('whySaha.headingEnd') }}
        </h2>
      </div>

      <div class="grid md:grid-cols-3 gap-8 lg:gap-10">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="relative p-8 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all duration-500 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
          :style="{ transitionDelay: isVisible ? `${feature.delay + 200}ms` : '0ms' }"
        >
          <div class="absolute top-4 right-6 font-heading text-5xl font-extrabold text-white/[0.06] select-none">
            {{ feature.number }}
          </div>

          <div class="mb-6">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/[0.08]">
              <svg v-if="feature.icon === 'personalized'" class="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
              </svg>
              <svg v-if="feature.icon === 'tutors'" class="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
              </svg>
              <svg v-if="feature.icon === 'group'" class="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
          </div>

          <h3 class="font-heading text-xl font-bold text-white mb-3 tracking-tight">
            {{ feature.title }}
          </h3>

          <p class="font-body text-sm text-white/70 font-normal leading-relaxed">
            {{ feature.description }}
          </p>
        </div>
      </div>

      <!-- Link to full About page -->
      <div
        class="text-center mt-16 transition-all duration-700 delay-500 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        <router-link
          to="/about"
          class="inline-flex items-center gap-2 font-body text-sm font-semibold text-white/60 hover:text-white transition-colors duration-300"
        >
          {{ t('whySaha.learnMore') }}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </router-link>
      </div>
    </div>
  </section>
</template>
