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
const isHome = computed(() => route.path === '/')
const isScrolled = computed(() => !isHome.value || props.scrollY > 50)

const navLinks = [
  { name: 'Home', to: '/' },
  { name: 'Programs', to: '/#programs' },
  { name: 'About', to: '/#about' },
  { name: 'Contact', to: '/contact' },
]
</script>

<template>
  <nav
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out"
    :class="[
      isScrolled
        ? 'bg-white/95 backdrop-blur-xl shadow-sm border-b border-navy-100'
        : 'bg-transparent'
    ]"
  >
    <div class="mx-auto px-6 md:px-10 lg:px-14">
      <div class="flex items-center justify-between h-24">
        <router-link to="/" class="flex items-center group">
          <!-- Text logo on dark hero -->
          <div v-if="!isScrolled" class="flex items-center gap-3 transition-all duration-500 group-hover:opacity-80">
            <span class="text-[72px] font-bold tracking-[0.15em] text-academic-300 leading-none" style="font-family: 'Cormorant Garamond', serif;">SAHA</span>
            <span class="w-px h-10 bg-white/30"></span>
            <span class="font-body text-[13px] tracking-[0.2em] uppercase text-white/50 font-medium">Institute<br/>for Learning</span>
          </div>
          <!-- Image logo on scroll -->
          <img
            v-else
            src="/logo.png"
            alt="SAHA Institute"
            class="w-40 h-auto transition-all duration-500 group-hover:scale-105 logo-sharp"
          />
        </router-link>

        <div class="hidden md:flex items-center gap-10">
          <router-link
            v-for="link in navLinks"
            :key="link.name"
            :to="link.to"
            class="text-sm font-body font-medium tracking-wide transition-colors duration-300 pb-1"
            :class="isScrolled ? 'text-navy-500 hover:text-navy-900' : 'text-white/70 hover:text-white'"
          >
            {{ link.name }}
          </router-link>
        </div>

        <button
          class="md:hidden p-2 transition-colors"
          :class="isScrolled ? 'text-navy-700 hover:text-navy-900' : 'text-white/70 hover:text-white'"
          aria-label="Open menu"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
  </nav>
</template>
