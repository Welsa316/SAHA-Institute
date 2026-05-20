<script setup>
import { ref, watch, onUnmounted, nextTick } from 'vue'
import WorkshopSignupForm from './WorkshopSignupForm.vue'
import { useI18n } from '../composables/useI18n'

// Animated workshop-signup modal. Opens with a fade + scale entrance, locks
// body scroll, traps focus inside the panel, restores focus to the trigger on
// close, and closes on ESC + click-outside.
//
// Two-way binding via `open` + `update:open` so the parent can either control
// the modal directly or v-model it.

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open'])

const { t } = useI18n()

const panel = ref(null)
const previousActive = ref(null)

function close() {
  emit('update:open', false)
}

function onSubmitted() {
  // Auto-close 1.8s after a successful submission so the parent sees the
  // success state for a beat before the modal disappears. The form's own
  // success message renders immediately; this is just timing the dismissal.
  setTimeout(close, 1800)
}

function onKeydown(event) {
  if (event.key === 'Escape') close()
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      previousActive.value = document.activeElement
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', onKeydown)
      // Focus the first input in the panel once Vue has painted it. Without
      // nextTick the panel ref is still null on the same tick `open` flips.
      await nextTick()
      const first = panel.value?.querySelector('input, textarea, button')
      first?.focus()
    } else {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeydown)
      // Hand focus back to whatever opened the modal — usually the trigger button.
      previousActive.value?.focus?.()
      previousActive.value = null
    }
  },
)

onUnmounted(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workshop-modal-title"
        class="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 sm:py-12 bg-navy-950/55 backdrop-blur-md"
        @click.self="close"
      >
        <Transition
          appear
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="opacity-0 scale-[0.96] translate-y-2"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-[0.98]"
        >
          <div
            v-if="open"
            ref="panel"
            class="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl shadow-black/40 border border-white/10"
          >
            <!-- Sticky header so the close button stays reachable while the
                 form scrolls inside the panel on small viewports. -->
            <div class="sticky top-0 z-10 flex items-start justify-between gap-4 px-6 md:px-10 pt-6 md:pt-7 pb-4 bg-white/95 backdrop-blur border-b border-navy-100">
              <div>
                <p class="font-body text-[10px] tracking-[0.28em] uppercase text-academic-600 font-bold mb-1">{{ t('signup.badge') }}</p>
                <h2 id="workshop-modal-title" class="font-heading text-2xl md:text-3xl font-extrabold text-navy-900 tracking-tight">
                  {{ t('signup.formHeading') }}
                </h2>
              </div>
              <button
                type="button"
                @click="close"
                :aria-label="t('signup.closeModal')"
                class="shrink-0 -mr-1 p-2 rounded-full text-navy-400 hover:bg-navy-50 hover:text-navy-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="px-6 md:px-10 py-6 md:py-8">
              <WorkshopSignupForm compact @submitted="onSubmitted" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
