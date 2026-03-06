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
  <section ref="sectionRef" class="relative py-32 md:py-40">
    <!-- Subtle top border -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-transparent via-navy-200 to-transparent"></div>

    <div class="max-w-4xl mx-auto px-6 md:px-12 text-center">
      <!-- Elegant quote mark -->
      <div
        class="mb-8 transition-all duration-1000 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
      >
        <span class="font-heading text-6xl text-academic-300 leading-none select-none">"</span>
      </div>

      <!-- Main quote text -->
      <p
        class="font-heading text-2xl md:text-3xl lg:text-4xl text-navy-800 leading-relaxed font-normal mb-10 transition-all duration-1000 delay-200 ease-out text-balance"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        Personalized tutoring for students who want to
        <span class="italic text-academic-600">understand</span>,
        not memorize.
      </p>

      <!-- Animated divider -->
      <div
        class="flex items-center justify-center gap-4 mb-10 transition-all duration-1000 delay-400 ease-out"
        :class="isVisible ? 'opacity-100' : 'opacity-0'"
      >
        <div
          class="h-px bg-gradient-to-r from-transparent to-navy-200 transition-all duration-1200 delay-600"
          :class="isVisible ? 'w-16' : 'w-0'"
        ></div>
        <div class="w-1.5 h-1.5 rounded-full bg-academic-400"></div>
        <div
          class="h-px bg-gradient-to-l from-transparent to-navy-200 transition-all duration-1200 delay-600"
          :class="isVisible ? 'w-16' : 'w-0'"
        ></div>
      </div>

      <!-- Supporting text -->
      <p
        class="font-body text-base md:text-lg text-navy-400 font-light max-w-lg mx-auto leading-relaxed transition-all duration-1000 delay-500 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        We believe every student has the potential to thrive. Our approach builds
        deep comprehension and lasting confidence.
      </p>
    </div>
  </section>
</template>
