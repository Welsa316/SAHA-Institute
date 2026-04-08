<script setup>
import { useIntersectionReveal } from '../composables/useIntersectionReveal'

const { sectionRef, isVisible } = useIntersectionReveal(0.15)

const programs = [
  {
    title: 'Mathematics',
    description: 'Building strong foundations from arithmetic to advanced concepts with clarity and confidence.',
    icon: 'math',
    iconBg: 'from-blue-500 to-indigo-600',
    delay: 0,
  },
  {
    title: 'Science',
    description: 'Exploring the natural world through hands-on curiosity and critical thinking skills.',
    icon: 'science',
    iconBg: 'from-emerald-500 to-teal-600',
    delay: 200,
  },
  {
    title: 'Reading & Writing',
    description: 'Developing confident communicators and creative thinkers through engaging literacy programs.',
    icon: 'reading',
    iconBg: 'from-amber-500 to-orange-600',
    delay: 400,
  },
]
</script>

<template>
  <section id="programs" ref="sectionRef" class="relative py-28 md:py-36 overflow-hidden bg-navy-50/30">
    <div class="relative max-w-6xl mx-auto px-6 md:px-12">
      <div class="text-center mb-20">
        <div
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-navy-100 mb-6 transition-all duration-700 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
        >
          <div class="w-1.5 h-1.5 rounded-full bg-academic-500"></div>
          <span class="font-body text-[10px] tracking-[0.3em] uppercase text-navy-600 font-bold">Our Programs</span>
        </div>
        <h2
          class="font-heading text-4xl md:text-5xl lg:text-6xl text-[#001B3D] font-extrabold tracking-tight transition-all duration-700 delay-100 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
        >
          Crafted for <span class="gradient-text">growth</span>
        </h2>
        <p
          class="mt-5 font-body text-lg text-navy-400 font-normal max-w-lg mx-auto transition-all duration-700 delay-200 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
        >
          Each program is thoughtfully designed to unlock your child's potential
        </p>
      </div>

      <div class="grid md:grid-cols-3 gap-8 lg:gap-10">
        <div
          v-for="program in programs"
          :key="program.title"
          class="group relative rounded-3xl p-8 md:p-10 bg-white border border-navy-100 hover:border-navy-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-500 ease-out cursor-pointer"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'"
          :style="{ transitionDelay: isVisible ? `${program.delay + 300}ms` : '0ms' }"
        >
          <div class="mb-8">
            <div
              :class="`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${program.iconBg} shadow-lg transition-all duration-300`"
            >
              <svg v-if="program.icon === 'math'" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7l10 10M17 7L7 17" opacity="0.5" />
              </svg>
              <svg v-if="program.icon === 'science'" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M5 14.5l-1.456 2.186A1.5 1.5 0 004.788 19h14.424a1.5 1.5 0 001.244-2.314L19 14.5" />
              </svg>
              <svg v-if="program.icon === 'reading'" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
          </div>

          <h3 class="font-heading text-xl md:text-2xl font-bold text-[#001B3D] mb-3 tracking-tight">
            {{ program.title }}
          </h3>

          <p class="font-body text-sm text-navy-400 font-normal leading-relaxed mb-6">
            {{ program.description }}
          </p>

          <div class="flex items-center gap-2 text-sm font-body font-semibold text-navy-300 group-hover:text-navy-600 transition-colors duration-300">
            <span>Learn More</span>
            <svg class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
