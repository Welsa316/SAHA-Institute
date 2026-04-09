<script setup>
import { useIntersectionReveal } from '../composables/useIntersectionReveal'
import { useRouter } from 'vue-router'

const router = useRouter()
const { sectionRef, isVisible } = useIntersectionReveal(0.3)
</script>

<template>
  <section ref="sectionRef" class="relative py-32 md:py-40 overflow-hidden bg-[#001B3D]">
    <div class="absolute inset-0" style="background: radial-gradient(ellipse at 50% 50%, rgba(43,127,255,0.08) 0%, transparent 60%);"></div>

    <div class="relative max-w-3xl mx-auto px-6 md:px-12 text-center">
      <div
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.08] mb-8 transition-all duration-700 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        <div class="w-1.5 h-1.5 rounded-full bg-academic-400"></div>
        <span class="font-body text-[10px] tracking-[0.3em] uppercase text-white/60 font-bold">Get Started</span>
      </div>

      <h2
        class="font-heading text-4xl md:text-5xl lg:text-6xl text-white font-extrabold tracking-tight leading-tight mb-6 transition-all duration-700 delay-100 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        Ready to help your child
        <span class="gradient-text-light">succeed</span>?
      </h2>

      <p
        class="font-body text-lg md:text-xl text-white/50 font-normal mb-14 max-w-lg mx-auto leading-relaxed transition-all duration-700 delay-200 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        Book a free consultation and we'll find the right program for your child.
      </p>

      <div
        class="flex flex-col sm:flex-row items-center justify-center gap-5 transition-all duration-700 delay-300 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        <router-link
          to="/contact"
          class="min-w-[240px] px-10 py-4 bg-white text-[#001B3D] font-body text-sm font-bold tracking-[0.15em] uppercase rounded-full hover:bg-navy-50 transition-colors duration-300"
        >
          Schedule a Consultation
        </router-link>
        <a
          href="tel:+15046673625"
          class="min-w-[200px] px-8 py-4 rounded-full font-body text-sm font-bold tracking-[0.15em] uppercase text-white/70 border-2 border-white/15 hover:border-white/30 hover:text-white transition-colors duration-300"
        >
          Call Us Today
        </a>
      </div>
    </div>
  </section>
</template>
