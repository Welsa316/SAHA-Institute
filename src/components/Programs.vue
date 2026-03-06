<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const sectionRef = ref(null)
const isVisible = ref(false)

let observer = null

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          isVisible.value = true
        }
      })
    },
    { threshold: 0.2 }
  )
  if (sectionRef.value) {
    observer.observe(sectionRef.value)
  }
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

const programs = [
  {
    title: 'Mathematics',
    description: 'Building strong foundations from arithmetic to advanced concepts',
    icon: 'math',
    delay: 0,
  },
  {
    title: 'Science',
    description: 'Exploring the natural world through curiosity and critical thinking',
    icon: 'science',
    delay: 200,
  },
  {
    title: 'Reading & Writing',
    description: 'Developing confident communicators and creative thinkers',
    icon: 'reading',
    delay: 400,
  },
]
</script>

<template>
  <section id="programs" ref="sectionRef" class="relative py-28 md:py-36">
    <!-- Background accent -->
    <div class="absolute inset-0 bg-gradient-to-b from-transparent via-navy-50/30 to-transparent"></div>

    <div class="relative max-w-6xl mx-auto px-6 md:px-12">
      <!-- Section header -->
      <div class="text-center mb-20">
        <span
          class="inline-block font-body text-xs tracking-[0.3em] uppercase text-academic-600 mb-4 transition-all duration-700 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
        >
          Our Programs
        </span>
        <h2
          class="font-heading text-3xl md:text-4xl lg:text-5xl text-navy-900 font-medium transition-all duration-700 delay-100 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
        >
          Crafted for <span class="italic text-academic-600">growth</span>
        </h2>
      </div>

      <!-- Program cards -->
      <div class="grid md:grid-cols-3 gap-8 lg:gap-12">
        <div
          v-for="(program, index) in programs"
          :key="program.title"
          class="group relative bg-white/60 backdrop-blur-sm rounded-2xl p-10 text-center transition-all duration-700 ease-out hover:-translate-y-2 hover:shadow-xl hover:shadow-navy-900/[0.04] border border-navy-100/40 hover:border-academic-200/60"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'"
          :style="{ transitionDelay: isVisible ? `${program.delay + 200}ms` : '0ms' }"
        >
          <!-- Subtle glow on hover -->
          <div class="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-b from-academic-50/50 to-transparent pointer-events-none"></div>

          <!-- Icon -->
          <div class="relative mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-navy-50 to-academic-50 group-hover:from-navy-100 group-hover:to-academic-100 transition-all duration-500">
              <!-- Math icon -->
              <svg v-if="program.icon === 'math'" class="w-7 h-7 text-navy-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7l10 10M17 7L7 17" opacity="0.4" />
              </svg>
              <!-- Science icon -->
              <svg v-if="program.icon === 'science'" class="w-7 h-7 text-navy-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M5 14.5l-1.456 2.186A1.5 1.5 0 004.788 19h14.424a1.5 1.5 0 001.244-2.314L19 14.5" />
                <circle cx="8" cy="16.5" r="0.75" fill="currentColor" opacity="0.4" />
                <circle cx="12" cy="15.5" r="0.75" fill="currentColor" opacity="0.4" />
                <circle cx="15" cy="17" r="0.75" fill="currentColor" opacity="0.4" />
              </svg>
              <!-- Reading icon -->
              <svg v-if="program.icon === 'reading'" class="w-7 h-7 text-navy-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
          </div>

          <!-- Title -->
          <h3 class="relative font-display text-xl font-semibold text-navy-800 mb-3 tracking-tight">
            {{ program.title }}
          </h3>

          <!-- Description -->
          <p class="relative font-body text-sm text-navy-400 font-light leading-relaxed">
            {{ program.description }}
          </p>

          <!-- Subtle bottom accent -->
          <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 group-hover:w-12 h-[2px] bg-gradient-to-r from-transparent via-academic-400 to-transparent transition-all duration-500 rounded-full"></div>
        </div>
      </div>
    </div>
  </section>
</template>
