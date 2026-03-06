<script setup>
import { computed } from 'vue'

const props = defineProps({
  scrollY: {
    type: Number,
    default: 0
  }
})

const isScrolled = computed(() => props.scrollY > 50)

const navLinks = [
  { name: 'Home', href: '#home' },
  { name: 'Programs', href: '#programs' },
  { name: 'About', href: '#about' },
  { name: 'Contact', href: '#contact' },
]
</script>

<template>
  <nav
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-out"
    :class="[
      isScrolled
        ? 'bg-cream-50/80 backdrop-blur-xl shadow-[0_1px_0_0_rgba(26,43,85,0.06)]'
        : 'bg-transparent'
    ]"
  >
    <div class="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
      <div class="flex items-center justify-between h-20">
        <!-- Logo -->
        <a href="#home" class="flex items-center gap-3 group">
          <img
            src="/logo.jpg"
            alt="SAHA Institute"
            class="h-10 w-auto rounded transition-transform duration-500 group-hover:scale-105"
          />
          <div class="hidden sm:block">
            <span class="font-display text-sm font-semibold tracking-wide text-navy-800">
              SAHA
            </span>
            <span class="block text-[10px] font-body text-navy-500 tracking-[0.2em] uppercase">
              Institute
            </span>
          </div>
        </a>

        <!-- Nav Links -->
        <div class="hidden md:flex items-center gap-10">
          <a
            v-for="link in navLinks"
            :key="link.name"
            :href="link.href"
            class="animated-underline text-sm font-body font-medium tracking-wide text-navy-600 hover:text-navy-900 transition-colors duration-300 pb-1"
          >
            {{ link.name }}
          </a>
        </div>

        <!-- Mobile menu button -->
        <button class="md:hidden p-2 text-navy-700 hover:text-navy-900 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
  </nav>
</template>
