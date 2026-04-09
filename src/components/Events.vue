<script setup>
import { useIntersectionReveal } from '../composables/useIntersectionReveal'

const { sectionRef, isVisible } = useIntersectionReveal(0.15)
</script>

<template>
  <section ref="sectionRef" class="relative py-24 md:py-32 overflow-hidden bg-[#001B3D]">
    <div class="absolute inset-0" style="background: radial-gradient(ellipse 80% 60% at 50% 50%, rgba(74,154,204,0.08) 0%, transparent 70%);"></div>

    <div class="relative max-w-6xl mx-auto px-6 md:px-12">
      <div class="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <!-- Flyer image -->
        <div
          class="transition-all duration-1000 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <div class="rounded-2xl overflow-hidden shadow-2xl shadow-black/30 border border-white/10">
            <img
              src="/summer-camp-2026.jpg"
              alt="SAHA Summer Camp & STEM 2026 flyer"
              class="w-full h-auto"
              loading="lazy"
            />
          </div>
        </div>

        <!-- Event details -->
        <div
          class="transition-all duration-1000 delay-200 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-400/30 mb-6">
            <div class="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
            <span class="font-body text-[10px] tracking-[0.3em] uppercase text-amber-300 font-bold">Upcoming Event</span>
          </div>

          <h2 class="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
            Summer Camp<br/><span class="gradient-text-light">&amp; STEM 2026</span>
          </h2>

          <p class="font-body text-white/50 mb-8 leading-relaxed">
            A full month of learning, fun, and discovery for kids ages 4 to 17. Swimming, scavenger hunts, bowling, arts &amp; crafts, STEM activities, and more.
          </p>

          <!-- Key details -->
          <div class="space-y-4 mb-10">
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-academic-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <span class="font-body text-sm text-white/70">June 1 - June 30, 2026</span>
            </div>
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-academic-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="font-body text-sm text-white/70">Mon-Thu 7 AM - 5 PM, Fri 7 AM - 1 PM</span>
            </div>
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-academic-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
              <div class="font-body text-sm text-white/70">
                <span class="text-white font-semibold">$400</span>/child (lunch included) or
                <span class="text-white font-semibold">$250</span>/child (bring your own lunch)
              </div>
            </div>
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-academic-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
              </svg>
              <span class="font-body text-sm text-white/70"><span class="text-white font-semibold">$20</span> registration fee</span>
            </div>
          </div>

          <!-- CTA -->
          <a
            href="tel:+15043739778"
            class="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-[#001B3D] font-body text-sm font-bold tracking-[0.15em] uppercase hover:bg-white/90 transition-colors duration-300 shadow-xl shadow-black/20"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call to Sign Up
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
