<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  count: { type: [Number, String], default: null },
})
</script>

<template>
  <header class="px-6 md:px-10 pt-8 md:pt-12 pb-6 border-b border-navy-100">
    <p v-if="eyebrow" class="font-body text-[10px] tracking-[0.3em] uppercase text-navy-400 font-bold mb-2">
      {{ eyebrow }}
    </p>
    <div class="flex items-end justify-between gap-6 flex-wrap">
      <div>
        <h1
          class="font-heading text-3xl md:text-4xl font-extrabold text-[#001B3D] tracking-tight"
          style="font-family: 'Cormorant Garamond', serif;"
        >
          {{ title }}
        </h1>
        <p v-if="subtitle" class="font-body text-sm text-navy-500 mt-2 max-w-xl leading-relaxed">
          {{ subtitle }}
        </p>
      </div>
      <div v-if="count !== null" class="text-right">
        <p class="font-body text-[10px] tracking-[0.2em] uppercase text-navy-400 font-bold">
          Total
        </p>
        <p class="font-heading text-3xl font-extrabold text-[#001B3D] tabular-nums">
          {{ count }}
        </p>
      </div>
      <slot name="actions" />
    </div>
  </header>
</template>
