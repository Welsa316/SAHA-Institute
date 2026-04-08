<script setup>
import { useIntersectionReveal } from '../composables/useIntersectionReveal'

const { sectionRef, isVisible } = useIntersectionReveal(0.15)

const programs = [
  {
    title: 'Academics',
    description: 'Mathematics, Science, Reading & Writing — building strong foundations with personalized attention.',
    subjects: ['Mathematics', 'Science', 'Reading & Writing'],
    price: '$30',
    priceUnit: '/hour',
    billing: 'Biweekly or monthly',
    icon: 'academics',
    iconBg: 'from-blue-500 to-indigo-600',
    delay: 0,
  },
  {
    title: 'Islamic Studies',
    description: 'Quran recitation, Tajwid, and memorization in a supportive one-on-one environment.',
    subjects: ['Quran Recitation', 'Tajwid', 'Memorization'],
    price: '$250',
    priceUnit: '/month',
    billing: 'Monthly',
    icon: 'islamic',
    iconBg: 'from-emerald-500 to-teal-600',
    delay: 200,
  },
  {
    title: 'Test Prep',
    description: 'Targeted preparation for standardized tests with proven strategies and practice.',
    subjects: ['AP Prep', 'ACT Prep', 'LEAP Prep'],
    price: '$30',
    priceUnit: '/hour',
    billing: 'Biweekly or monthly',
    icon: 'testprep',
    iconBg: 'from-amber-500 to-orange-600',
    delay: 400,
  },
]
</script>

<template>
  <section id="programs" ref="sectionRef" class="relative py-28 md:py-36 overflow-hidden bg-navy-50/30">
    <div class="relative max-w-6xl mx-auto px-6 md:px-12">
      <div class="text-center mb-10">
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
          Academics, Quran studies, and standardized test prep — all one-on-one
        </p>
      </div>

      <!-- Info badges -->
      <div
        class="flex flex-wrap items-center justify-center gap-3 mb-16 transition-all duration-700 delay-300 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-navy-100 text-xs font-body font-semibold text-navy-600">
          <svg class="w-4 h-4 text-academic-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>
          Ages 4–17 · Pre-K through High School
        </span>
        <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-navy-100 text-xs font-body font-semibold text-navy-600">
          <svg class="w-4 h-4 text-academic-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          All classes are one-on-one
        </span>
      </div>

      <!-- Program cards -->
      <div class="grid md:grid-cols-3 gap-8 lg:gap-10">
        <div
          v-for="program in programs"
          :key="program.title"
          class="relative rounded-3xl p-8 md:p-10 bg-white border border-navy-100 transition-all duration-500 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'"
          :style="{ transitionDelay: isVisible ? `${program.delay + 400}ms` : '0ms' }"
        >
          <!-- Icon -->
          <div class="mb-6">
            <div
              :class="`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${program.iconBg} shadow-lg`"
            >
              <svg v-if="program.icon === 'academics'" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <svg v-if="program.icon === 'islamic'" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
              <svg v-if="program.icon === 'testprep'" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
              </svg>
            </div>
          </div>

          <!-- Title -->
          <h3 class="font-heading text-xl md:text-2xl font-bold text-[#001B3D] mb-2 tracking-tight">
            {{ program.title }}
          </h3>

          <!-- Price -->
          <div class="mb-4">
            <span class="font-heading text-2xl font-extrabold text-academic-600">{{ program.price }}</span>
            <span class="font-body text-sm text-navy-400">{{ program.priceUnit }}</span>
            <span class="block font-body text-xs text-navy-300 mt-1">{{ program.billing }}</span>
          </div>

          <!-- Description -->
          <p class="font-body text-sm text-navy-400 font-normal leading-relaxed mb-5">
            {{ program.description }}
          </p>

          <!-- Subjects list -->
          <div class="flex flex-wrap gap-2 mb-6">
            <span
              v-for="subject in program.subjects"
              :key="subject"
              class="px-3 py-1 rounded-full bg-navy-50 text-[11px] font-body font-semibold text-navy-600"
            >
              {{ subject }}
            </span>
          </div>

        </div>
      </div>
    </div>
  </section>
</template>
