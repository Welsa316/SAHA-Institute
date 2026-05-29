<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import ShinyButton from './ShinyButton.vue'

const { t, locale, isRTL, toggleLocale } = useI18n()

const props = defineProps({
  scrollY: {
    type: Number,
    default: 0,
  },
})

const route = useRoute()
const isHome = computed(() => route.path === '/')
const isScrolled = computed(() => !isHome.value || props.scrollY > 50)
const mobileOpen = ref(false)

// Nav links — Home was dropped (the logo lock-up handles home navigation) and
// the old "Sign Up" link was rolled into the amber Summer Signups CTA on the
// right. "Register" is the year-round tutoring entry point — distinct verb
// from "Summer Signups" so the two don't visually conflate (events vs.
// permanent student account).
const navLinks = computed(() => [
  { name: t('nav.programs'), to: '/#programs' },
  { name: t('nav.register'), to: '/tutoring-signup' },
  { name: t('nav.about'), to: '/about' },
  { name: t('nav.contact'), to: '/contact' },
])

function toggleMenu() {
  mobileOpen.value = !mobileOpen.value
}

function closeMenu() {
  mobileOpen.value = false
}
</script>

<template>
  <nav
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out"
    @keydown.escape="closeMenu"
    :class="[
      isScrolled || mobileOpen
        ? 'bg-white/95 backdrop-blur-xl shadow-sm border-b border-navy-100'
        : 'bg-transparent'
    ]"
  >
    <div class="mx-auto px-6 md:px-10 lg:px-14">
      <div class="flex items-center justify-between h-20 md:h-24 relative">
        <router-link to="/" class="flex items-center group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none" :class="!isScrolled && !mobileOpen ? 'md:flex-none flex-1 justify-center md:justify-start' : ''" @click="closeMenu">
          <!-- Mobile: stacked centered layout -->
          <div v-if="!isScrolled && !mobileOpen" class="md:hidden flex flex-col items-center transition-all duration-500 group-hover:opacity-80 max-w-[65%]">
            <span
              class="font-bold tracking-[0.15em] text-academic-300 leading-none whitespace-nowrap"
              :class="isRTL ? 'text-[32px]' : 'text-[40px]'"
              style="font-family: 'Cormorant Garamond', serif;"
            >{{ t('nav.saha') }}</span>
            <span
              class="font-body font-medium mt-1 whitespace-nowrap"
              :class="isRTL ? 'text-[11px] text-white/60' : 'text-[9px] tracking-[0.25em] uppercase text-white/70'"
            >{{ t('nav.tagline') }}</span>
          </div>
          <!-- Desktop: inline layout -->
          <div v-if="!isScrolled && !mobileOpen" class="hidden md:flex items-center gap-3 transition-all duration-500 group-hover:opacity-80">
            <span class="text-[72px] font-bold tracking-[0.15em] text-academic-300 leading-none" style="font-family: 'Cormorant Garamond', serif;">{{ t('nav.saha') }}</span>
            <span class="w-px h-10 bg-white/30"></span>
            <span class="font-body text-[13px] tracking-[0.2em] uppercase text-white/70 font-medium">{{ t('nav.tagline') }}</span>
          </div>
          <img
            v-else
            src="/logo.png"
            alt="SAHA Institute — home"
            class="w-40 h-auto transition-all duration-500 group-hover:scale-105 logo-sharp"
          />
        </router-link>

        <div class="hidden md:flex items-center gap-8 lg:gap-10">
          <router-link
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="text-sm font-body font-medium tracking-wide transition-colors duration-300 pb-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
            :class="isScrolled ? 'text-navy-500 hover:text-navy-900' : 'text-white/70 hover:text-white'"
          >
            {{ link.name }}
          </router-link>
          <ShinyButton to="/enroll" :label="t('nav.enroll')" />
          <button
            @click="toggleLocale"
            class="text-sm font-body font-medium px-3 py-1.5 rounded-full border transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
            :class="isScrolled ? 'border-navy-200 text-navy-600 hover:bg-navy-50' : 'border-white/20 text-white/70 hover:bg-white/10'"
          >
            {{ locale === 'en' ? '\u0627\u0631\u062F\u0648' : 'EN' }}
          </button>
        </div>

        <button
          class="md:hidden p-3 absolute transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
          :class="[
            isScrolled || mobileOpen ? 'text-navy-700 hover:text-navy-900' : 'text-white/70 hover:text-white',
            isRTL ? 'left-6' : 'right-6'
          ]"
          :aria-label="mobileOpen ? t('nav.closeMenu') : t('nav.openMenu')"
          @click="toggleMenu"
        >
          <svg v-if="!mobileOpen" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile menu -->
    <div
      v-if="mobileOpen"
      class="md:hidden bg-white/95 backdrop-blur-xl border-t border-navy-100 px-6 pb-6"
    >
      <div class="flex flex-col gap-1 pt-2">
        <router-link
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="block py-3 px-4 rounded-xl text-sm font-body font-medium text-navy-700 hover:bg-navy-50 hover:text-navy-900 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
          @click="closeMenu"
        >
          {{ link.name }}
        </router-link>
        <div class="pt-3 mt-1 border-t border-navy-100 flex justify-center">
          <ShinyButton to="/enroll" :label="t('nav.enroll')" />
        </div>
      </div>
    </div>
  </nav>
</template>
