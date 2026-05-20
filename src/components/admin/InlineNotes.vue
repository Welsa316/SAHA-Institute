<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: null },
  placeholder: { type: String, default: 'Add a note…' },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['save'])

const editing = ref(false)
const draft = ref(props.modelValue ?? '')

watch(
  () => props.modelValue,
  (v) => {
    if (!editing.value) draft.value = v ?? ''
  },
)

function open() {
  draft.value = props.modelValue ?? ''
  editing.value = true
}

function cancel() {
  editing.value = false
  draft.value = props.modelValue ?? ''
}

function commit() {
  // Empty trimmed string becomes null so we don't store whitespace.
  const next = draft.value.trim().length === 0 ? null : draft.value.trim()
  if (next === (props.modelValue ?? null)) {
    editing.value = false
    return
  }
  emit('save', next)
  editing.value = false
}
</script>

<template>
  <div class="min-w-[12rem] max-w-md">
    <button
      v-if="!editing"
      type="button"
      @click="open"
      class="text-left w-full px-3 py-1.5 rounded-lg text-sm font-body text-navy-600 hover:bg-navy-50 transition-colors line-clamp-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
      :class="!modelValue ? 'text-navy-300 italic' : ''"
    >
      {{ modelValue || placeholder }}
    </button>
    <div v-else class="space-y-2">
      <textarea
        v-model="draft"
        rows="3"
        class="w-full px-3 py-2 rounded-lg bg-white border border-navy-200 text-navy-800 font-body text-sm placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400"
        :placeholder="placeholder"
      ></textarea>
      <div class="flex gap-2 justify-end">
        <button
          type="button"
          @click="cancel"
          class="px-3 py-1.5 rounded-lg text-xs font-body font-semibold text-navy-600 hover:bg-navy-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
        >
          Cancel
        </button>
        <button
          type="button"
          @click="commit"
          :disabled="saving"
          class="px-3 py-1.5 rounded-lg text-xs font-body font-semibold bg-[#001B3D] text-white hover:bg-navy-800 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </div>
  </div>
</template>
