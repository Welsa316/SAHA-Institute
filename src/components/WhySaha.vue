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
    { threshold: 0.2 }
  )
  if (sectionRef.value) {
    observer.observe(sectionRef.value)
  }
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

const features = [
  {
    title: 'Personalized Learning',
    description: 'Every student receives a tailored approach that adapts to their unique strengths and goals.',
    icon: 'personalized',
    number: '01',
    delay: 0,
  },
  {
    title: 'Experienced Tutors',
    description: 'Passionate educators with deep subject expertise and a commitment to student success.',
    icon: 'tutors',
    number: '02',
    delay: 150,
  },
  {
    title: 'Small Group Focus',
    description: 'Intimate learning environments where every question matters and every student is seen.',
    icon: 'group',
    number: '03',
    delay: 300,
  },
]
</script>

<template>
  <section id="about" ref="sectionRef" class="relative py-28 md:py-36 overflow-hidden">
    <!-- Background with subtle gradient mesh -->
    <div class="absolute inset-0"
         style="background: radial-gradient(ellipse at 30% 20%, rgba(91,173,217,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(26,43,85,0.06) 0%, transparent 50%);">
    </div>

    <div class="relative max-w-6xl mx-auto px-6 md:px-12">
      <!-- Section header -->
      <div class="text-center mb-20">
        <div
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-navy-100/50 mb-6 transition-all duration-700 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
        >
          <div class="w-1.5 h-1.5 rounded-full bg-navy-500"></div>
          <span class="font-body text-xs tracking-[0.2em] uppercase text-navy-700 font-semibold">Why SAHA</span>
        </div>
        <h2
          class="font-heading text-4xl md:text-5xl lg:text-6xl text-navy-900 font-semibold transition-all duration-700 delay-100 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
        >
          The <span class="gradient-text italic">difference</span> is<br class="hidden md:block" /> in the details
        </h2>
      </div>

      <!-- Features - horizontal layout with numbers -->
      <div class="grid md:grid-cols-3 gap-10 lg:gap-14">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="group relative transition-all duration-700 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
          :style="{ transitionDelay: isVisible ? `${feature.delay + 200}ms` : '0ms' }"
        >
          <!-- Card with glass effect -->
          <div class="relative p-8 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/60 hover:bg-white/80 hover:border-academic-200/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-navy-900/[0.05]">
            <!-- Large faded number -->
            <div class="absolute top-4 right-6 font-display text-5xl font-bold text-navy-100/60 select-none group-hover:text-academic-200/60 transition-colors duration-500">
              {{ feature.number }}
            </div>

            <!-- Animated icon container -->
            <div class="mb-6">
              <div class="relative inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-navy-100 to-academic-100 group-hover:from-navy-800 group-hover:to-academic-600 transition-all duration-500 group-hover:shadow-lg group-hover:shadow-academic-500/20 group-hover:scale-110">
                <!-- Personalized -->
                <svg v-if="feature.icon === 'personalized'" class="w-6 h-6 text-navy-700 group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                </svg>
                <!-- Tutors -->
                <svg v-if="feature.icon === 'tutors'" class="w-6 h-6 text-navy-700 group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                </svg>
                <!-- Group -->
                <svg v-if="feature.icon === 'group'" class="w-6 h-6 text-navy-700 group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
            </div>

            <!-- Title -->
            <h3 class="font-display text-xl font-bold text-navy-800 mb-3 tracking-tight">
              {{ feature.title }}
            </h3>

            <!-- Description -->
            <p class="font-body text-sm text-navy-400 font-light leading-relaxed">
              {{ feature.description }}
            </p>

            <!-- Bottom accent line -->
            <div class="mt-6 w-0 group-hover:w-12 h-[2px] rounded-full transition-all duration-500"
                 style="background: linear-gradient(90deg, #4a9acc, #1a2b55);"></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
