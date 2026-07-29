<script setup>
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()
</script>

<template>
  <footer class="relative py-16 bg-navy-950 overflow-hidden">
    <div class="absolute top-0 left-0 right-0 h-px bg-navy-800"></div>

    <div class="relative max-w-6xl mx-auto px-6 md:px-12">
      <div class="grid md:grid-cols-3 gap-12 mb-12">
        <div class="flex flex-col items-center md:items-start">
          <img
            src="/logo.svg"
            alt="SAHA Institute logo"
            class="w-36 h-auto brightness-0 invert opacity-90 mb-4 logo-sharp"
          />
          <h3 class="font-heading text-sm font-bold text-white tracking-[0.15em] uppercase mb-1">
            {{ t('footer.brand') }}
          </h3>
          <p class="font-body text-xs text-navy-500 tracking-[0.3em] uppercase">
            {{ t('footer.est') }}
          </p>
        </div>

        <div class="text-center md:text-left">
          <h4 class="font-heading text-xs font-bold text-white tracking-[0.2em] uppercase mb-5">{{ t('footer.quickLinks') }}</h4>
          <div class="flex flex-col gap-3">
            <router-link to="/" class="font-body text-sm text-navy-400 hover:text-white transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none">{{ t('nav.home') }}</router-link>
            <router-link to="/#programs" class="font-body text-sm text-navy-400 hover:text-white transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none">{{ t('nav.programs') }}</router-link>
            <router-link to="/workshops" class="font-body text-sm text-navy-400 hover:text-white transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none">{{ t('nav.workshops') }}</router-link>
            <router-link to="/enroll" class="font-body text-sm text-navy-400 hover:text-white transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none">{{ t('nav.enrollPage') }}</router-link>
            <router-link to="/about" class="font-body text-sm text-navy-400 hover:text-white transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none">{{ t('nav.about') }}</router-link>
            <router-link to="/contact" class="font-body text-sm text-navy-400 hover:text-white transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none">{{ t('nav.contact') }}</router-link>
            <router-link to="/careers" class="font-body text-sm text-navy-400 hover:text-white transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none">{{ t('careers.badge') }}</router-link>
          </div>
        </div>

        <div class="text-center md:text-left">
          <h4 class="font-heading text-xs font-bold text-white tracking-[0.2em] uppercase mb-5">{{ t('footer.contactTitle') }}</h4>
          <div class="flex flex-col gap-3">
            <p class="font-body text-sm text-navy-400">{{ t('footer.address') }}</p>
            <a href="tel:+15046673625" class="font-body text-sm text-navy-400 hover:text-white transition-colors duration-300"><span class="text-navy-500">{{ t('footer.phoneCall') }}:</span> (504) 667-3625</a>
            <a href="https://wa.me/15043739778" target="_blank" rel="noopener" class="font-body text-sm text-navy-400 hover:text-white transition-colors duration-300"><span class="text-navy-500">{{ t('footer.phoneText') }}:</span> (504) 373-9778</a>
            <a href="mailto:sahaforlearning@gmail.com" class="font-body text-sm text-navy-400 hover:text-white transition-colors duration-300">sahaforlearning@gmail.com</a>
            <p class="font-body text-sm text-navy-400">{{ t('footer.hours') }}</p>
          </div>
        </div>
      </div>

      <div class="w-full h-px bg-navy-800/50 mb-8"></div>

      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p class="font-body text-[11px] text-navy-600 tracking-wider">
          {{ t('footer.copyright') }}
        </p>

        <div class="flex items-center gap-3">
          <a href="https://www.instagram.com/sahainstituteforlearning/" target="_blank" rel="noopener" aria-label="Instagram" class="w-11 h-11 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-navy-400 hover:text-white hover:border-white/20 transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          </a>
          <a href="https://www.facebook.com/SahaForLearning" target="_blank" rel="noopener" aria-label="Facebook" class="w-11 h-11 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-navy-400 hover:text-white hover:border-white/20 transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg>
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>
