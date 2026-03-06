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
  <section ref="sectionRef" class="relative py-28 md:py-36 overflow-hidden">
    <!-- Decorative colored band at top -->
    <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-academic-400/50 to-transparent"></div>

    <!-- Background accents -->
    <div class="absolute top-10 right-0 w-96 h-96 rounded-full opacity-20"
         style="background: radial-gradient(circle, rgba(74,154,204,0.3) 0%, transparent 70%);"></div>
    <div class="absolute bottom-10 left-0 w-72 h-72 rounded-full opacity-15"
         style="background: radial-gradient(circle, rgba(26,43,85,0.2) 0%, transparent 70%);"></div>

    <div class="relative max-w-5xl mx-auto px-6 md:px-12 text-center">
      <!-- Elegant large quote mark with color -->
      <div
        class="mb-6 transition-all duration-1000 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-90'"
      >
        <span class="font-heading text-8xl gradient-text-light leading-none select-none">"</span>
      </div>

      <!-- Main quote text - more impactful -->
      <p
        class="font-heading text-3xl md:text-4xl lg:text-5xl text-navy-800 leading-snug font-medium mb-8 transition-all duration-1000 delay-200 ease-out text-balance"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        Personalized tutoring for students<br class="hidden md:block" />
        who want to
        <span class="relative inline-block">
          <span class="gradient-text font-semibold italic">understand</span>
          <!-- Animated underline accent -->
          <span
            class="absolute -bottom-1 left-0 h-[3px] rounded-full transition-all duration-1000 delay-700"
            :class="isVisible ? 'w-full' : 'w-0'"
            style="background: linear-gradient(90deg, #4a9acc, #1a2b55);"
          ></span>
        </span>, not memorize.
      </p>

      <!-- Animated divider - more elaborate -->
      <div
        class="flex items-center justify-center gap-3 mb-8 transition-all duration-1000 delay-400 ease-out"
        :class="isVisible ? 'opacity-100' : 'opacity-0'"
      >
        <div
          class="h-[2px] rounded-full transition-all duration-1200 delay-600"
          :class="isVisible ? 'w-20' : 'w-0'"
          style="background: linear-gradient(90deg, transparent, #4a9acc);"
        ></div>
        <div class="flex gap-1.5">
          <div class="w-2 h-2 rounded-full bg-academic-400 animate-pulse-soft"></div>
          <div class="w-2 h-2 rounded-full bg-navy-400 animate-pulse-soft" style="animation-delay: 0.5s;"></div>
          <div class="w-2 h-2 rounded-full bg-academic-300 animate-pulse-soft" style="animation-delay: 1s;"></div>
        </div>
        <div
          class="h-[2px] rounded-full transition-all duration-1200 delay-600"
          :class="isVisible ? 'w-20' : 'w-0'"
          style="background: linear-gradient(90deg, #4a9acc, transparent);"
        ></div>
      </div>

      <!-- Supporting text -->
      <p
        class="font-body text-lg md:text-xl text-navy-400 font-light max-w-2xl mx-auto leading-relaxed transition-all duration-1000 delay-500 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        We believe every student has the potential to thrive. Our approach builds
        <span class="text-academic-600 font-medium">deep comprehension</span> and
        <span class="text-navy-700 font-medium">lasting confidence</span>.
      </p>
    </div>
  </section>
</template>
