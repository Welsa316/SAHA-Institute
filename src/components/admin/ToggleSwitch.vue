<script setup>
defineProps({
  modelValue: { type: Boolean, required: true },
  label: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label || 'Toggle'"
    :disabled="disabled"
    @click="$emit('update:modelValue', !modelValue)"
    class="relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none disabled:opacity-50"
    :class="modelValue ? 'bg-emerald-500' : 'bg-navy-200'"
  >
    <span
      class="inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200"
      :class="modelValue ? 'translate-x-5' : 'translate-x-0.5'"
    />
  </button>
</template>
