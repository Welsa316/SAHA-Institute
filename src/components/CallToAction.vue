<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

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
  <section id="contact" ref="sectionRef" class="relative py-32 md:py-40 overflow-hidden">
    <!-- Rich gradient background -->
    <div class="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950"></div>

    <!-- Colored overlay effects -->
    <div class="absolute inset-0"
         style="background: radial-gradient(ellipse at 20% 50%, rgba(74,154,204,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 30%, rgba(91,173,217,0.1) 0%, transparent 50%), radial-gradient(ellipse at 50% 90%, rgba(45,74,142,0.12) 0%, transparent 50%);">
    </div>

    <!-- Pattern overlay -->
    <div class="absolute inset-0 opacity-[0.04]"
         style="background-image: radial-gradient(circle, #fff 1px, transparent 1px); background-size: 24px 24px;">
    </div>

    <!-- Floating colored accents -->
    <div class="absolute top-[15%] left-[8%] w-80 h-80 rounded-full animate-float-slow"
         style="background: radial-gradient(circle, rgba(91,173,217,0.12) 0%, transparent 70%);">
    </div>
    <div class="absolute bottom-[15%] right-[8%] w-64 h-64 blob animate-float-slower"
         style="background: radial-gradient(circle, rgba(74,154,204,0.1) 0%, transparent 70%);">
    </div>
    <!-- Small floating circles -->
    <div class="absolute top-[30%] right-[25%] w-3 h-3 rounded-full bg-academic-400/30 animate-float"></div>
    <div class="absolute bottom-[35%] left-[20%] w-2 h-2 rounded-full bg-academic-300/20 animate-float-slow"></div>
    <!-- Ring -->
    <div class="absolute top-[20%] right-[12%] w-16 h-16 rounded-full border border-white/[0.06] animate-float-slower"></div>

    <div class="relative max-w-3xl mx-auto px-6 md:px-12 text-center">
      <!-- Label badge -->
      <div
        class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.08] border border-white/[0.08] mb-8 transition-all duration-700 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        <div class="w-1.5 h-1.5 rounded-full bg-academic-400 animate-pulse-soft"></div>
        <span class="font-body text-xs tracking-[0.2em] uppercase text-academic-300 font-medium">Get Started</span>
      </div>

      <!-- Heading -->
      <h2
        class="font-heading text-4xl md:text-5xl lg:text-6xl text-white font-semibold leading-tight mb-6 transition-all duration-700 delay-100 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        Ready to help your child<br class="hidden md:block" />
        <span class="gradient-text-light italic">succeed</span>?
      </h2>

      <!-- Subtitle -->
      <p
        class="font-body text-lg md:text-xl text-navy-300 font-light mb-14 max-w-lg mx-auto leading-relaxed transition-all duration-700 delay-200 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        Take the first step toward a brighter academic future.
      </p>

      <!-- CTA Buttons -->
      <div
        class="flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 delay-300 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
      >
        <!-- Primary CTA - white button -->
        <router-link
          to="/contact"
          class="group relative inline-flex items-center gap-3 px-10 py-4 bg-white text-navy-900 font-body text-sm font-semibold tracking-wider uppercase rounded-full overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-academic-400/20"
        >
          <!-- Shimmer effect -->
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-academic-100/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <span class="relative">Schedule a Consultation</span>
          <svg
            class="relative w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </router-link>

        <!-- Secondary CTA -->
        <a
          href="tel:+15046673625"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-full font-body text-sm font-medium tracking-wider uppercase text-white/80 border border-white/20 hover:border-academic-400/50 hover:text-white transition-all duration-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-academic-400/10 hover:bg-white/[0.05]"
        >
          Call Us Today
        </a>
      </div>
    </div>
  </section>
</template>
