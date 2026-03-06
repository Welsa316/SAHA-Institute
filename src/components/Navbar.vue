<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps({
  scrollY: {
    type: Number,
    default: 0,
  },
})

const route = useRoute()
const isScrolled = computed(() => props.scrollY > 50)
const isHome = computed(() => route.path === '/')

const navLinks = [
  { name: 'Home', to: '/' },
  { name: 'Programs', to: '/#programs' },
  { name: 'About', to: '/#about' },
  { name: 'Contact', to: '/contact' },
]
</script>

<template>
  <nav
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-out"
    :class="[
      isScrolled
        ? 'bg-navy-900/95 backdrop-blur-2xl shadow-lg shadow-navy-900/20 border-b border-navy-700/30'
        : 'bg-transparent'
    ]"
  >
    <div class="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
      <div class="flex items-center justify-between h-20">
        <!-- Logo -->
        <router-link to="/" class="flex items-center group">
          <img
            src="/logo.png"
            alt="SAHA Institute"
            class="w-28 h-auto transition-all duration-500 group-hover:scale-105 group-hover:brightness-110 logo-sharp"
            :class="isScrolled ? 'brightness-0 invert' : ''"
          />
        </router-link>

        <!-- Nav Links -->
        <div class="hidden md:flex items-center gap-10">
          <router-link
            v-for="link in navLinks"
            :key="link.name"
            :to="link.to"
            class="animated-underline text-sm font-body font-medium tracking-wide transition-colors duration-300 pb-1"
            :class="[
              isScrolled
                ? 'text-navy-200 hover:text-white'
                : 'text-navy-600 hover:text-navy-900'
            ]"
          >
            {{ link.name }}
          </router-link>

          <!-- Nav CTA button -->
          <router-link
            to="/contact"
            class="px-6 py-2.5 rounded-full text-xs font-body font-semibold tracking-wider uppercase transition-all duration-500 hover:-translate-y-0.5"
            :class="[
              isScrolled
                ? 'text-navy-900 bg-white hover:shadow-lg hover:shadow-white/20'
                : 'text-white bg-gradient-to-r from-navy-800 to-academic-600 hover:shadow-lg hover:shadow-academic-500/20'
            ]"
          >
            Enroll Now
          </router-link>
        </div>

        <!-- Mobile menu button -->
        <button class="md:hidden p-2 transition-colors" :class="isScrolled ? 'text-white' : 'text-navy-700 hover:text-navy-900'">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
  </nav>
</template>
