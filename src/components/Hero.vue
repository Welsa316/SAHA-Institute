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
  <section id="home" class="relative min-h-screen flex items-center justify-center overflow-hidden">
    <!-- Rich animated gradient background -->
    <div
      class="absolute inset-0 animate-gradient-shift"
      style="
        background: linear-gradient(135deg, #f0f7fc 0%, #e8f4fd 20%, #fefdfb 40%, #f0f3f9 60%, #e8f0fb 80%, #f5f0ff 100%);
        background-size: 400% 400%;
      "
    ></div>

    <!-- Mesh gradient overlay for depth -->
    <div class="absolute inset-0 mesh-gradient"></div>

    <!-- Large colorful blobs -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <!-- Primary blob - top right -->
      <div
        class="absolute -top-20 -right-20 w-[500px] h-[500px] blob animate-float-slow opacity-60"
        style="background: linear-gradient(135deg, rgba(74,154,204,0.25) 0%, rgba(91,173,217,0.15) 50%, rgba(123,193,230,0.1) 100%);"
      ></div>
      <!-- Secondary blob - bottom left -->
      <div
        class="absolute -bottom-32 -left-32 w-[600px] h-[600px] blob-2 animate-float-slower opacity-50"
        style="background: linear-gradient(225deg, rgba(26,43,85,0.15) 0%, rgba(45,74,142,0.1) 50%, rgba(74,154,204,0.08) 100%);"
      ></div>
      <!-- Accent blob - center left -->
      <div
        class="absolute top-1/3 -left-16 w-72 h-72 rounded-full animate-float opacity-40"
        style="background: radial-gradient(circle, rgba(91,173,217,0.2) 0%, transparent 70%);"
      ></div>

      <!-- Floating geometric shapes with color -->
      <!-- Circle ring -->
      <div
        class="absolute top-[18%] right-[15%] w-20 h-20 rounded-full border-2 border-academic-300/30 animate-float-slow"
      ></div>
      <!-- Filled small circle -->
      <div
        class="absolute top-[65%] right-[20%] w-4 h-4 rounded-full bg-academic-400/40 animate-float"
      ></div>
      <!-- Diamond -->
      <div
        class="absolute top-[25%] left-[12%] w-8 h-8 rotate-45 bg-gradient-to-br from-navy-400/20 to-academic-400/20 animate-float-slower"
      ></div>
      <!-- Plus sign -->
      <div class="absolute bottom-[30%] right-[8%] animate-float-slow opacity-30">
        <div class="relative w-6 h-6">
          <div class="absolute top-1/2 left-0 w-full h-[2px] -translate-y-1/2 bg-academic-500"></div>
          <div class="absolute top-0 left-1/2 w-[2px] h-full -translate-x-1/2 bg-academic-500"></div>
        </div>
      </div>
      <!-- Dots cluster -->
      <div
        class="absolute bottom-[25%] left-[8%] w-24 h-24 animate-float-slower opacity-30"
        style="background-image: radial-gradient(circle, #4a9acc 1.5px, transparent 1.5px); background-size: 12px 12px;"
      ></div>
      <!-- Thin gradient line -->
      <div
        class="absolute top-[40%] right-[30%] w-px h-40 animate-pulse-soft"
        style="background: linear-gradient(to bottom, transparent, rgba(74,154,204,0.3), transparent);"
      ></div>
      <!-- Another ring -->
      <div
        class="absolute bottom-[40%] left-[25%] w-12 h-12 rounded-full border border-navy-300/20 animate-float"
      ></div>
    </div>

    <!-- Content -->
    <div class="relative z-10 text-center px-6 max-w-5xl mx-auto">
      <!-- Logo - MUCH BIGGER -->
      <div
        class="mb-8 transition-all duration-1200 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'"
      >
        <div class="relative inline-block">
          <!-- Glow behind logo -->
          <div class="absolute inset-0 blur-3xl opacity-30 scale-110"
               style="background: radial-gradient(circle, rgba(74,154,204,0.4) 0%, transparent 70%);">
          </div>
          <img
            src="/logo.png"
            alt="SAHA Institute For Learning"
            class="relative mx-auto h-44 md:h-56 lg:h-64 w-auto drop-shadow-lg"
          />
        </div>
      </div>

      <!-- Decorative line with gradient -->
      <div
        class="mx-auto mb-8 transition-all duration-1000 delay-300 ease-out flex items-center justify-center gap-3"
        :class="isVisible ? 'opacity-100' : 'opacity-0'"
      >
        <div
          class="h-[2px] rounded-full transition-all duration-1200 delay-500"
          :class="isVisible ? 'w-12' : 'w-0'"
          style="background: linear-gradient(90deg, transparent, #4a9acc);"
        ></div>
        <div class="w-2 h-2 rounded-full bg-gradient-to-br from-academic-400 to-navy-600 animate-pulse-soft"></div>
        <div
          class="h-[2px] rounded-full transition-all duration-1200 delay-500"
          :class="isVisible ? 'w-12' : 'w-0'"
          style="background: linear-gradient(90deg, #4a9acc, transparent);"
        ></div>
      </div>

      <!-- Tagline - bigger and more colorful -->
      <h1
        class="font-heading text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-semibold leading-[1.1] tracking-tight mb-6 transition-all duration-1000 delay-500 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
      >
        <span class="text-navy-900">Where Curiosity</span><br />
        <span class="gradient-text italic">Meets Clarity</span>
      </h1>

      <!-- Subtitle -->
      <p
        class="font-body text-lg md:text-xl lg:text-2xl text-navy-500 font-light max-w-2xl mx-auto mb-14 leading-relaxed transition-all duration-1000 delay-700 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        Nurturing academic excellence through
        <span class="text-academic-600 font-medium">personalized learning</span>
      </p>

      <!-- CTA Buttons -->
      <div
        class="flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-1000 delay-[900ms] ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        <!-- Primary CTA -->
        <a
          href="#programs"
          class="group relative inline-flex items-center gap-3 px-10 py-4 rounded-full font-body text-sm font-semibold tracking-wider uppercase text-white overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-navy-900/20"
        >
          <!-- Animated gradient background -->
          <div class="absolute inset-0 bg-gradient-to-r from-navy-800 via-navy-700 to-academic-600 bg-[length:200%_100%] transition-all duration-700 group-hover:bg-[position:100%_0]"></div>
          <span class="relative">Explore Programs</span>
          <svg
            class="relative w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>

        <!-- Secondary CTA -->
        <a
          href="#contact"
          class="group inline-flex items-center gap-2 px-8 py-4 rounded-full font-body text-sm font-medium tracking-wider uppercase text-navy-700 border-2 border-navy-200 hover:border-academic-400 hover:text-academic-700 transition-all duration-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-academic-500/10"
        >
          Get in Touch
          <svg
            class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h8m0 0l-4-4m4 4l-4 4" />
          </svg>
        </a>
      </div>

      <!-- Stats strip -->
      <div
        class="mt-20 flex flex-wrap items-center justify-center gap-8 md:gap-16 transition-all duration-1000 delay-[1100ms] ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        <div class="text-center">
          <div class="font-display text-3xl md:text-4xl font-bold gradient-text">5+</div>
          <div class="font-body text-xs text-navy-400 tracking-wider uppercase mt-1">Years Teaching</div>
        </div>
        <div class="w-px h-10 bg-gradient-to-b from-transparent via-navy-200 to-transparent"></div>
        <div class="text-center">
          <div class="font-display text-3xl md:text-4xl font-bold gradient-text">200+</div>
          <div class="font-body text-xs text-navy-400 tracking-wider uppercase mt-1">Students Helped</div>
        </div>
        <div class="w-px h-10 bg-gradient-to-b from-transparent via-navy-200 to-transparent"></div>
        <div class="text-center">
          <div class="font-display text-3xl md:text-4xl font-bold gradient-text">98%</div>
          <div class="font-body text-xs text-navy-400 tracking-wider uppercase mt-1">Satisfaction Rate</div>
        </div>
      </div>
    </div>

    <!-- Scroll indicator -->
    <div
      class="absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-1000 delay-[1400ms] ease-out"
      :class="isVisible ? 'opacity-100' : 'opacity-0'"
    >
      <div class="flex flex-col items-center gap-2">
        <span class="text-[10px] font-body tracking-[0.3em] uppercase text-navy-400">Scroll</span>
        <div class="w-6 h-10 rounded-full border-2 border-navy-300/40 flex justify-center pt-2">
          <div class="w-1 h-2.5 rounded-full bg-academic-400 animate-bounce"></div>
        </div>
      </div>
    </div>
  </section>
</template>
