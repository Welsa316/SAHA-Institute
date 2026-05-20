<script setup>
const props = defineProps({
  grade: {
    type: String,
    required: true,
    validator: (v) => ['elementary', 'middle', 'high'].includes(v),
  },
  size: {
    type: String,
    default: 'md', // 'sm' | 'md'
  },
})

const LABELS = {
  elementary: 'Elementary',
  middle: 'Middle',
  high: 'High',
}

// Color coding stays close to the SAHA palette but uses distinct hues per grade so the
// admin can scan a table and tell levels apart at a glance.
const TONE = {
  elementary: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  middle: 'bg-amber-50 text-amber-800 border-amber-200',
  high: 'bg-sky-50 text-sky-800 border-sky-200',
}
</script>

<template>
  <span
    class="inline-flex items-center font-body font-bold uppercase tracking-[0.15em] border rounded-full"
    :class="[
      TONE[grade],
      size === 'sm' ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'
    ]"
  >
    {{ LABELS[grade] }}
  </span>
</template>
