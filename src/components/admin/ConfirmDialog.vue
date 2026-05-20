<script setup>
defineProps({
  show: { type: Boolean, required: true },
  title: { type: String, default: 'Are you sure?' },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Confirm' },
  cancelLabel: { type: String, default: 'Cancel' },
  danger: { type: Boolean, default: false },
})
const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="show" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" @click.self="emit('cancel')">
      <div
        role="dialog"
        aria-modal="true"
        class="bg-white rounded-2xl shadow-2xl shadow-black/20 max-w-md w-full p-6 md:p-7"
      >
        <h2 class="font-heading text-xl font-bold text-[#001B3D] mb-2">{{ title }}</h2>
        <p v-if="message" class="font-body text-sm text-navy-500 leading-relaxed mb-6">{{ message }}</p>
        <div class="flex gap-3 justify-end">
          <button
            type="button"
            @click="emit('cancel')"
            class="px-5 py-2.5 rounded-full border border-navy-200 text-navy-700 font-body text-sm font-semibold hover:bg-navy-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            @click="emit('confirm')"
            class="px-5 py-2.5 rounded-full font-body text-sm font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus:outline-none"
            :class="danger
              ? 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-400'
              : 'bg-[#001B3D] hover:bg-navy-800 focus-visible:outline-academic-400'"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
