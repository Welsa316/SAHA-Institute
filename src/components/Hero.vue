<script setup>
import { onMounted, ref } from 'vue'

const isVisible = ref(false)

onMounted(() => {
  setTimeout(() => {
    isVisible.value = true
  }, 200)
})
</script>

<template>
  <section id="home" class="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 bg-[#001B3D]">

    <!-- Glow — saturated blue light spreading across hero like the 21st.dev reference -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
      <!-- Base ambient glow — covers entire hero -->
      <div
        class="absolute inset-0"
        style="background: radial-gradient(ellipse 100% 80% at 50% -10%, rgba(50,120,220,0.4) 0%, rgba(40,100,200,0.2) 30%, rgba(20,60,150,0.08) 55%, transparent 75%);"
      ></div>
      <!-- Mid-layer glow — brighter blue concentration -->
      <div
        class="absolute inset-0"
        style="background: radial-gradient(ellipse 70% 55% at 50% 5%, rgba(80,150,255,0.35) 0%, rgba(60,130,240,0.12) 45%, transparent 70%);"
      ></div>
      <!-- Hot spot — bright core at top center -->
      <div
        class="absolute inset-0"
        style="background: radial-gradient(ellipse 35% 30% at 50% 0%, rgba(130,180,255,0.4) 0%, rgba(100,160,250,0.15) 40%, transparent 65%);"
      ></div>
      <!-- White highlight peak -->
      <div
        class="absolute inset-0"
        style="background: radial-gradient(ellipse 20% 15% at 50% 0%, rgba(200,220,255,0.25) 0%, transparent 50%);"
      ></div>
    </div>

    <div class="relative z-10 text-center px-6 max-w-5xl mx-auto">
      <!-- Glass badge -->
      <div
        class="mb-10 transition-all duration-1000 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        <span class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-body font-bold tracking-[0.3em] uppercase text-white/80 backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_4px_16px_rgba(0,0,0,0.1)]">
          <span class="w-1.5 h-1.5 rounded-full bg-academic-400"></span>
          Est. 2020 · Academic Excellence
        </span>
      </div>

      <h1
        class="font-heading text-5xl md:text-7xl lg:text-8xl xl:text-[6.5rem] font-extrabold leading-none tracking-tight mb-8"
      >
        <span
          class="block text-white transition-all duration-1000 delay-200 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >Where Curiosity</span>
        <span class="block overflow-hidden">
          <span
            class="block gradient-text-light pb-3 transition-all duration-1000 delay-500 ease-out"
            :class="isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'"
          >Meets Clarity</span>
        </span>
      </h1>

      <p
        class="font-body text-lg md:text-xl text-white/50 font-normal max-w-xl mx-auto mb-14 leading-relaxed transition-all duration-1000 delay-700 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        One-on-one tutoring in academics, Islamic studies, and test prep for ages 4–17.
      </p>

      <div
        class="flex flex-col sm:flex-row items-center justify-center gap-5 transition-all duration-1000 delay-[900ms] ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        <router-link
          to="/#programs"
          class="min-w-[220px] px-10 py-4 rounded-full bg-white text-[#001B3D] font-body text-sm font-bold tracking-[0.15em] uppercase hover:bg-white/90 transition-colors duration-300 shadow-xl shadow-black/20"
        >
          Explore Programs
        </router-link>
        <router-link
          to="/contact"
          class="min-w-[220px] px-10 py-4 rounded-full border-2 border-white/20 text-white/70 font-body text-sm font-bold tracking-[0.15em] uppercase hover:border-white/40 hover:text-white transition-colors duration-300"
        >
          Get in Touch
        </router-link>
      </div>

      <!-- Phone CTA -->
      <div
        class="mt-8 transition-all duration-1000 delay-[1000ms] ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        <a
          href="tel:+15043739778"
          class="inline-flex items-center gap-2 font-body text-sm text-white/50 hover:text-white transition-colors duration-300"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          Or call us: (504) 373-9778
        </a>
      </div>

      <div
        class="mt-16 inline-flex flex-wrap items-center justify-center gap-8 md:gap-0 bg-white/[0.06] rounded-2xl px-8 md:px-14 py-7 transition-all duration-1000 delay-[1100ms] ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        <div class="flex items-center gap-3 md:px-8">
          <svg class="w-5 h-5 text-academic-400 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          <div>
            <div class="font-heading text-2xl md:text-3xl font-extrabold text-white">10+</div>
            <div class="font-body text-[10px] text-white/40 tracking-[0.15em] uppercase font-semibold">Years Teaching</div>
          </div>
        </div>
        <div class="hidden md:block w-px h-12 bg-white/10"></div>
        <div class="flex items-center gap-3 md:px-8">
          <svg class="w-5 h-5 text-academic-400 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>
          </svg>
          <div>
            <div class="font-heading text-2xl md:text-3xl font-extrabold text-white">200+</div>
            <div class="font-body text-[10px] text-white/40 tracking-[0.15em] uppercase font-semibold">Students Helped</div>
          </div>
        </div>
        <div class="hidden md:block w-px h-12 bg-white/10"></div>
        <div class="flex items-center gap-3 md:px-8">
          <svg class="w-5 h-5 text-academic-400 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
          </svg>
          <div>
            <div class="font-heading text-2xl md:text-3xl font-extrabold text-white">100%</div>
            <div class="font-body text-[10px] text-white/40 tracking-[0.15em] uppercase font-semibold">Satisfaction</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
