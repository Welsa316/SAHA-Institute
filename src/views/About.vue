<script setup>
import { useIntersectionReveal } from '../composables/useIntersectionReveal'

const { sectionRef: missionRef, isVisible: missionVisible } = useIntersectionReveal(0.2)
const { sectionRef: teamRef, isVisible: teamVisible } = useIntersectionReveal(0.15)

const tutors = [
  { name: 'Anila', role: 'Founder & Lead Tutor', initials: 'A' },
  { name: 'Tom Ngo', role: 'Tutor', initials: 'TN' },
  { name: 'Lena Tamer', role: 'Tutor', initials: 'LT' },
  { name: 'Walid Elsayed', role: 'Tutor', initials: 'WE' },
  { name: 'Dua Cheema', role: 'Tutor', initials: 'DC' },
]
</script>

<template>
  <!-- Hero Banner -->
  <section class="relative py-28 md:py-36 overflow-hidden bg-[#001B3D]">
    <div class="absolute inset-0" style="background: radial-gradient(ellipse 80% 60% at 50% 20%, rgba(100,160,255,0.15) 0%, transparent 70%);"></div>
    <div class="relative max-w-4xl mx-auto px-6 md:px-12 text-center">
      <div class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.08] mb-6">
        <div class="w-1.5 h-1.5 rounded-full bg-academic-400"></div>
        <span class="font-body text-[10px] tracking-[0.3em] uppercase text-white/60 font-bold">About Us</span>
      </div>
      <h1 class="font-heading text-4xl md:text-5xl lg:text-6xl text-white font-extrabold tracking-tight leading-tight mb-4">
        Our <span class="gradient-text-light">Story</span>
      </h1>
      <p class="font-body text-lg md:text-xl text-white/50 font-normal max-w-lg mx-auto leading-relaxed">
        How a substitute teacher's observation became a learning center serving 200+ students.
      </p>
    </div>
  </section>

  <!-- Mission Section -->
  <section ref="missionRef" class="relative py-24 md:py-32 overflow-hidden">
    <div class="max-w-4xl mx-auto px-6 md:px-12">
      <div class="grid md:grid-cols-2 gap-16 items-center">
        <div
          class="transition-all duration-1000 ease-out"
          :class="missionVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-navy-50 border border-navy-100 mb-6">
            <div class="w-1.5 h-1.5 rounded-full bg-academic-500"></div>
            <span class="font-body text-[10px] tracking-[0.3em] uppercase text-navy-600 font-bold">Our Mission</span>
          </div>
          <h2 class="font-heading text-3xl md:text-4xl font-extrabold text-[#001B3D] tracking-tight mb-6">
            Where it all <span class="gradient-text">began</span>
          </h2>
          <div class="space-y-5 font-body text-navy-500 leading-relaxed">
            <p>
              SAHA Institute for Learning was born from a simple but powerful observation. While working as a substitute teacher at ISGNO, our founder Anila saw students brimming with potential — bright, curious minds eager to learn.
            </p>
            <p>
              But she also saw the barriers. Many families faced financial hardships that made accessing quality tutoring difficult. The gap between potential and opportunity was clear.
            </p>
            <p>
              In 2020, Anila decided to bridge that gap. She founded SAHA to create a <span class="text-[#001B3D] font-semibold">comfortable, supportive space</span> where every student — regardless of background — could receive the personalized attention they deserve.
            </p>
            <p>
              Today, SAHA serves students ages 4 through 17 across academics, Islamic studies, and standardized test preparation. Every class is one-on-one, because we believe every student's journey is unique.
            </p>
          </div>
        </div>

        <div
          class="relative transition-all duration-1000 delay-300 ease-out"
          :class="missionVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <div class="aspect-[4/5] rounded-3xl overflow-hidden bg-navy-50 border border-navy-100">
            <img
              src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=750&fit=crop&crop=faces"
              alt="Students learning together"
              class="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Meet the Tutors -->
  <section ref="teamRef" class="relative py-24 md:py-32 overflow-hidden bg-navy-950">
    <div class="max-w-6xl mx-auto px-6 md:px-12">
      <div class="text-center mb-16">
        <div
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.08] mb-6 transition-all duration-700 ease-out"
          :class="teamVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
        >
          <div class="w-1.5 h-1.5 rounded-full bg-academic-400"></div>
          <span class="font-body text-[10px] tracking-[0.3em] uppercase text-white/70 font-bold">Our Team</span>
        </div>
        <h2
          class="font-heading text-4xl md:text-5xl text-white font-extrabold tracking-tight transition-all duration-700 delay-100 ease-out"
          :class="teamVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
        >
          Meet the <span class="gradient-text-light">Tutors</span>
        </h2>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8">
        <div
          v-for="(tutor, index) in tutors"
          :key="tutor.name"
          class="text-center transition-all duration-700 ease-out"
          :class="teamVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
          :style="{ transitionDelay: teamVisible ? `${index * 100 + 200}ms` : '0ms' }"
        >
          <!-- Placeholder avatar -->
          <div class="w-24 h-24 md:w-28 md:h-28 mx-auto mb-4 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
            <span class="font-heading text-xl md:text-2xl font-bold text-white/30">{{ tutor.initials }}</span>
          </div>
          <h3 class="font-heading text-base font-bold text-white mb-1">{{ tutor.name }}</h3>
          <p class="font-body text-xs text-white/40">{{ tutor.role }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="relative py-20 md:py-28 overflow-hidden">
    <div class="max-w-3xl mx-auto px-6 md:px-12 text-center">
      <h2 class="font-heading text-3xl md:text-4xl font-extrabold text-[#001B3D] tracking-tight mb-6">
        Ready to get started?
      </h2>
      <p class="font-body text-lg text-navy-400 mb-10 max-w-md mx-auto">
        Schedule a consultation and let us find the right program for your child.
      </p>
      <router-link
        to="/contact"
        class="inline-flex px-10 py-4 rounded-full bg-[#001B3D] text-white font-body text-sm font-bold tracking-[0.15em] uppercase hover:bg-navy-800 transition-colors duration-300 shadow-xl shadow-navy-900/15"
      >
        Contact Us
      </router-link>
    </div>
  </section>
</template>
