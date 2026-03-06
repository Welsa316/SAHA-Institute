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
    { threshold: 0.3 }
  )
  if (sectionRef.value) {
    observer.observe(sectionRef.value)
  }
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>

<template>
  <section id="contact" ref="sectionRef" class="relative py-28 md:py-36 overflow-hidden">
    <!-- Gradient background -->
    <div class="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950"></div>

    <!-- Subtle pattern overlay -->
    <div class="absolute inset-0 opacity-[0.03]"
         style="background-image: radial-gradient(circle, #fff 1px, transparent 1px); background-size: 24px 24px;">
    </div>

    <!-- Floating accents -->
    <div class="absolute top-1/4 left-[10%] w-64 h-64 rounded-full animate-float-slow"
         style="background: radial-gradient(circle, rgba(91,173,217,0.08) 0%, transparent 70%);">
    </div>
    <div class="absolute bottom-1/4 right-[10%] w-48 h-48 rounded-full animate-float-slower"
         style="background: radial-gradient(circle, rgba(74,154,204,0.06) 0%, transparent 70%);">
    </div>

    <div class="relative max-w-3xl mx-auto px-6 md:px-12 text-center">
      <!-- Label -->
      <span
        class="inline-block font-body text-xs tracking-[0.3em] uppercase text-academic-400/70 mb-6 transition-all duration-700 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        Get Started
      </span>

      <!-- Heading -->
      <h2
        class="font-heading text-3xl md:text-4xl lg:text-5xl text-white font-medium leading-tight mb-6 transition-all duration-700 delay-100 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        Ready to help your child
        <span class="italic text-academic-300">succeed</span>?
      </h2>

      <!-- Subtitle -->
      <p
        class="font-body text-lg text-navy-300 font-light mb-12 max-w-lg mx-auto leading-relaxed transition-all duration-700 delay-200 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        Take the first step toward a brighter academic future.
      </p>

      <!-- CTA Button -->
      <div
        class="transition-all duration-700 delay-300 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        <a
          href="#"
          class="group inline-flex items-center gap-3 px-10 py-4 bg-white text-navy-900 font-body text-sm font-medium tracking-wider uppercase rounded-full hover:bg-cream-100 transition-all duration-500 hover:shadow-2xl hover:shadow-white/10 hover:-translate-y-0.5"
        >
          Schedule a Consultation
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
  </section>
</template>
