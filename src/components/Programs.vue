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
    { threshold: 0.15 }
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
    description: 'Building strong foundations from arithmetic to advanced concepts with clarity and confidence.',
    icon: 'math',
    color: 'from-blue-500/10 to-indigo-500/10',
    borderColor: 'hover:border-blue-300',
    iconBg: 'from-blue-500 to-indigo-600',
    iconGlow: 'group-hover:shadow-blue-500/25',
    accent: '#4f6af5',
    delay: 0,
  },
  {
    title: 'Science',
    description: 'Exploring the natural world through hands-on curiosity and critical thinking skills.',
    icon: 'science',
    color: 'from-emerald-500/10 to-teal-500/10',
    borderColor: 'hover:border-emerald-300',
    iconBg: 'from-emerald-500 to-teal-600',
    iconGlow: 'group-hover:shadow-emerald-500/25',
    accent: '#10b981',
    delay: 200,
  },
  {
    title: 'Reading & Writing',
    description: 'Developing confident communicators and creative thinkers through engaging literacy programs.',
    icon: 'reading',
    color: 'from-amber-500/10 to-orange-500/10',
    borderColor: 'hover:border-amber-300',
    iconBg: 'from-amber-500 to-orange-600',
    iconGlow: 'group-hover:shadow-amber-500/25',
    accent: '#f59e0b',
    delay: 400,
  },
]
</script>

<template>
  <section id="programs" ref="sectionRef" class="relative py-28 md:py-36 overflow-hidden">
    <!-- Rich background -->
    <div class="absolute inset-0 bg-gradient-to-b from-navy-50/40 via-academic-50/20 to-cream-50"></div>

    <!-- Background decorations -->
    <div class="absolute top-20 left-10 w-32 h-32 rounded-full border border-academic-200/30 animate-float-slow"></div>
    <div class="absolute bottom-20 right-10 w-20 h-20 rounded-full border border-navy-200/20 animate-float-slower"></div>
    <div class="absolute top-1/2 right-[5%] w-2 h-2 rounded-full bg-academic-400/30 animate-float"></div>
    <div class="absolute top-1/3 left-[5%] w-3 h-3 rounded-full bg-navy-300/20 animate-float-slower"></div>

    <div class="relative max-w-6xl mx-auto px-6 md:px-12">
      <!-- Section header -->
      <div class="text-center mb-20">
        <div
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-academic-100/60 mb-6 transition-all duration-700 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
        >
          <div class="w-1.5 h-1.5 rounded-full bg-academic-500"></div>
          <span class="font-body text-xs tracking-[0.2em] uppercase text-academic-700 font-semibold">Our Programs</span>
        </div>
        <h2
          class="font-heading text-4xl md:text-5xl lg:text-6xl text-navy-900 font-semibold transition-all duration-700 delay-100 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
        >
          Crafted for <span class="gradient-text italic">growth</span>
        </h2>
        <p
          class="mt-4 font-body text-lg text-navy-400 font-light max-w-lg mx-auto transition-all duration-700 delay-200 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
        >
          Each program is thoughtfully designed to unlock your child's potential
        </p>
      </div>

      <!-- Program cards -->
      <div class="grid md:grid-cols-3 gap-8 lg:gap-10">
        <div
          v-for="program in programs"
          :key="program.title"
          class="group relative rounded-3xl p-8 md:p-10 transition-all duration-700 ease-out cursor-pointer hover:-translate-y-3 border border-white/60"
          :class="[
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16',
            program.borderColor,
          ]"
          :style="{ transitionDelay: isVisible ? `${program.delay + 300}ms` : '0ms' }"
        >
          <!-- Card background -->
          <div class="absolute inset-0 rounded-3xl bg-white/80 backdrop-blur-sm transition-all duration-500 group-hover:bg-white/95"></div>
          <!-- Colored gradient overlay on hover -->
          <div :class="`absolute inset-0 rounded-3xl bg-gradient-to-br ${program.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`"></div>
          <!-- Glow effect -->
          <div class="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl"
               :style="`background: radial-gradient(circle at center, ${program.accent}15, transparent 70%);`"></div>

          <!-- Icon -->
          <div class="relative mb-8">
            <div
              :class="`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${program.iconBg} shadow-lg ${program.iconGlow} transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl`"
            >
              <!-- Math icon -->
              <svg v-if="program.icon === 'math'" class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7l10 10M17 7L7 17" opacity="0.5" />
              </svg>
              <!-- Science icon -->
              <svg v-if="program.icon === 'science'" class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M5 14.5l-1.456 2.186A1.5 1.5 0 004.788 19h14.424a1.5 1.5 0 001.244-2.314L19 14.5" />
                <circle cx="8" cy="16.5" r="0.75" fill="currentColor" opacity="0.5" />
                <circle cx="12" cy="15.5" r="0.75" fill="currentColor" opacity="0.5" />
                <circle cx="15" cy="17" r="0.75" fill="currentColor" opacity="0.5" />
              </svg>
              <!-- Reading icon -->
              <svg v-if="program.icon === 'reading'" class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
          </div>

          <!-- Title -->
          <h3 class="relative font-display text-xl md:text-2xl font-bold text-navy-800 mb-3 tracking-tight">
            {{ program.title }}
          </h3>

          <!-- Description -->
          <p class="relative font-body text-sm text-navy-400 font-light leading-relaxed mb-6">
            {{ program.description }}
          </p>

          <!-- Learn more link -->
          <div class="relative flex items-center gap-2 text-sm font-body font-semibold opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0"
               :style="`color: ${program.accent};`">
            <span>Learn More</span>
            <svg class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>

          <!-- Colored bottom line -->
          <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 group-hover:w-20 h-[3px] rounded-full transition-all duration-500"
               :style="`background: linear-gradient(90deg, transparent, ${program.accent}, transparent);`"></div>
        </div>
      </div>
    </div>
  </section>
</template>
