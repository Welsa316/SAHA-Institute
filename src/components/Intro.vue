<script setup>
import { useIntersectionReveal } from '../composables/useIntersectionReveal'

const { sectionRef, isVisible } = useIntersectionReveal(0.3)
</script>

<template>
  <section ref="sectionRef" class="relative py-28 md:py-36 overflow-hidden">
    <div class="relative max-w-4xl mx-auto px-6 md:px-12 text-center">
      <div
        class="mb-6 transition-all duration-1000 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
      >
        <span class="font-heading text-8xl text-navy-200 leading-none select-none">"</span>
      </div>

      <p
        class="font-heading text-3xl md:text-4xl lg:text-5xl text-[#001B3D] leading-snug font-bold mb-10 transition-all duration-1000 delay-200 ease-out text-balance"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        Personalized tutoring for students<br class="hidden md:block" />
        who want to
        <span class="gradient-text font-extrabold">understand</span>, not memorize.
      </p>

      <div
        class="mx-auto w-16 h-[3px] bg-[#001B3D] rounded-full mb-10 transition-all duration-1000 delay-400 ease-out"
        :class="isVisible ? 'opacity-100' : 'opacity-0'"
      ></div>

      <p
        class="font-body text-lg md:text-xl text-navy-400 font-normal max-w-2xl mx-auto leading-relaxed transition-all duration-1000 delay-500 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        We believe every student has the potential to thrive. Our approach builds
        <span class="text-[#001B3D] font-semibold">deep comprehension</span> and
        <span class="text-[#001B3D] font-semibold">lasting confidence</span>.
      </p>
    </div>
  </section>
</template>
