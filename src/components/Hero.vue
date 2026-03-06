<script setup>
import { onMounted, ref } from 'vue'

const isVisible = ref(false)
const logoLoaded = ref(false)

onMounted(() => {
  setTimeout(() => {
    isVisible.value = true
  }, 200)
})
</script>

<template>
  <section id="home" class="relative min-h-screen flex items-center justify-center overflow-hidden">
    <!-- Animated gradient background -->
    <div
      class="absolute inset-0 animate-gradient-shift"
      style="
        background: linear-gradient(135deg, #fefdfb 0%, #f0f3f9 25%, #fefdfb 50%, #f0f7fc 75%, #fefdfb 100%);
        background-size: 400% 400%;
      "
    ></div>

    <!-- Floating geometric shapes -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <!-- Circle -->
      <div
        class="absolute top-[15%] left-[10%] w-72 h-72 rounded-full animate-float-slow"
        style="background: radial-gradient(circle, rgba(91,173,217,0.06) 0%, transparent 70%);"
      ></div>
      <!-- Square rotated -->
      <div
        class="absolute bottom-[20%] right-[8%] w-48 h-48 rotate-12 animate-float-slower"
        style="background: linear-gradient(135deg, rgba(26,43,85,0.04) 0%, transparent 60%); border-radius: 24px;"
      ></div>
      <!-- Small circle -->
      <div
        class="absolute top-[60%] left-[70%] w-24 h-24 rounded-full animate-float"
        style="background: radial-gradient(circle, rgba(74,154,204,0.08) 0%, transparent 70%);"
      ></div>
      <!-- Thin line accent -->
      <div
        class="absolute top-[30%] right-[20%] w-px h-32 animate-pulse-soft"
        style="background: linear-gradient(to bottom, transparent, rgba(26,43,85,0.1), transparent);"
      ></div>
      <!-- Dot grid -->
      <div
        class="absolute bottom-[35%] left-[15%] w-20 h-20 animate-float-slower opacity-20"
        style="background-image: radial-gradient(circle, #1a2b55 1px, transparent 1px); background-size: 10px 10px;"
      ></div>
    </div>

    <!-- Content -->
    <div class="relative z-10 text-center px-6 max-w-4xl mx-auto">
      <!-- Logo -->
      <div
        class="mb-10 transition-all duration-1000 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
      >
        <img
          src="/logo.jpg"
          alt="SAHA Institute For Learning"
          class="mx-auto h-28 md:h-36 lg:h-40 w-auto drop-shadow-sm"
          @load="logoLoaded = true"
        />
      </div>

      <!-- Thin decorative line -->
      <div
        class="mx-auto mb-10 transition-all duration-1000 delay-300 ease-out"
        :class="isVisible ? 'opacity-100 w-16' : 'opacity-0 w-0'"
      >
        <div class="h-px bg-gradient-to-r from-transparent via-academic-400 to-transparent"></div>
      </div>

      <!-- Tagline -->
      <h1
        class="font-heading text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-medium text-navy-900 leading-tight tracking-tight mb-8 transition-all duration-1000 delay-500 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        Where Curiosity<br class="hidden sm:block" />
        <span class="italic text-academic-600">Meets Clarity</span>
      </h1>

      <!-- Subtitle -->
      <p
        class="font-body text-lg md:text-xl text-navy-500 font-light max-w-xl mx-auto mb-12 leading-relaxed transition-all duration-1000 delay-700 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        Nurturing academic excellence through personalized learning
      </p>

      <!-- CTA Button -->
      <div
        class="transition-all duration-1000 delay-[900ms] ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        <a
          href="#programs"
          class="group inline-flex items-center gap-3 px-8 py-4 bg-navy-800 text-cream-50 font-body text-sm font-medium tracking-wider uppercase rounded-full hover:bg-navy-700 transition-all duration-500 hover:shadow-lg hover:shadow-navy-900/10 hover:-translate-y-0.5"
        >
          Explore Programs
          <svg
            class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>
    </div>

    <!-- Scroll indicator -->
    <div
      class="absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-1000 delay-[1200ms] ease-out"
      :class="isVisible ? 'opacity-100' : 'opacity-0'"
    >
      <div class="flex flex-col items-center gap-2">
        <span class="text-[10px] font-body tracking-[0.3em] uppercase text-navy-400">Scroll</span>
        <div class="w-px h-8 bg-gradient-to-b from-navy-300 to-transparent animate-pulse-soft"></div>
      </div>
    </div>
  </section>
</template>
