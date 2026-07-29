<script setup>
import { useI18n } from '../composables/useI18n'

// Photo grid for the camp recap. Given real photos it renders them; while the
// gallery is still being collected it shows deliberate "photos coming soon"
// tiles so the layout ships before the pictures do. Drop images into
// public/camp-gallery/ and list them in the parent's photo arrays to fill it.

const props = defineProps({
  // [{ src: '/camp-gallery/mornings-1.jpg', alt: '…' }, …]
  photos: { type: Array, default: () => [] },
  // Tiles to show while photos is empty.
  placeholderCount: { type: Number, default: 4 },
  // Shorter tiles for the home-page teaser strip.
  compact: { type: Boolean, default: false },
})

const { t } = useI18n()

const tileClass = (i) =>
  props.compact ? 'h-28 md:h-36' : i % 3 === 0 ? 'h-40 md:h-56' : 'h-40 md:h-44'
</script>

<template>
  <div class="grid grid-cols-2 gap-3 md:gap-4">
    <template v-if="photos.length">
      <img
        v-for="(p, i) in photos"
        :key="p.src"
        :src="p.src"
        :alt="p.alt || ''"
        loading="lazy"
        class="rounded-xl object-cover w-full shadow-[0_0_24px_rgba(2,27,61,0.06),0_1px_1px_rgba(0,0,0,0.05),0_0_0_1px_rgba(2,27,61,0.04),0_16px_68px_rgba(2,27,61,0.05)]"
        :class="tileClass(i)"
        :style="p.pos ? { objectPosition: p.pos } : undefined"
      />
    </template>
    <template v-else>
      <div
        v-for="i in placeholderCount"
        :key="i"
        class="relative rounded-xl overflow-hidden border border-navy-100 bg-gradient-to-br from-navy-50 via-academic-50 to-navy-100 flex flex-col items-center justify-center gap-2"
        :class="tileClass(i - 1)"
        role="img"
        :aria-label="t('campGallery.comingSoon')"
      >
        <div class="absolute inset-0 opacity-40" style="background: radial-gradient(ellipse 70% 60% at 30% 20%, rgba(74,154,204,0.18) 0%, transparent 70%);"></div>
        <svg class="relative w-6 h-6 text-navy-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
        </svg>
        <span class="relative font-body text-[10px] tracking-[0.18em] uppercase text-navy-400 font-bold">{{ t('campGallery.comingSoon') }}</span>
      </div>
    </template>
  </div>
</template>
