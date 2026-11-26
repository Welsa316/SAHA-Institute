<script setup>
import { nextTick, ref, watch } from 'vue'
import { useAdminApi } from '../../composables/useAdminApi.js'
import { useModalA11y } from '../../composables/useModalA11y.js'
import { formatPhoneInput } from '../../utils/phone.js'

// Admin-side family registration. Same fields the old public /register form
// collected: one or more student names (siblings share one login), parent
// email, parent phone (optional) and a password. Rows are created approved,
// so the family can log in at /login straight away once the admin shares the
// email + password with them.

const props = defineProps({
  show: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'registered'])

const api = useAdminApi()

const MAX_STUDENTS = 6

// Stable ids so the v-for keys on identity, not index — removing a middle
// name keeps the remaining inputs' state on the right rows.
let nameUid = 0
const newName = () => ({ id: nameUid++, value: '' })

const blankForm = () => ({ names: [newName()], email: '', phone: '', password: '' })
const form = ref(blankForm())
const showPassword = ref(false)
const submitting = ref(false)
const error = ref('')
const liveMsg = ref('')

// Fresh form every time the modal opens.
watch(
  () => props.show,
  (open) => {
    if (open) {
      form.value = blankForm()
      showPassword.value = false
      error.value = ''
    }
  },
)

const panel = ref(null)
useModalA11y(() => props.show, panel, close)

function close() {
  if (submitting.value) return
  emit('close')
}

async function focusNameAt(i) {
  await nextTick()
  document.getElementById(`rf-name-${i}`)?.focus()
}
function announce(msg) {
  liveMsg.value = ''
  nextTick(() => { liveMsg.value = msg })
}

function addName() {
  if (form.value.names.length >= MAX_STUDENTS) return
  form.value.names.push(newName())
  announce('Added a student name field.')
  focusNameAt(form.value.names.length - 1)
}

function removeName(i) {
  form.value.names.splice(i, 1)
  announce('Removed a student name field.')
  focusNameAt(Math.min(i, form.value.names.length - 1))
}

function onPhoneInput(e) {
  form.value.phone = formatPhoneInput(e.target.value)
}

async function onSubmit() {
  error.value = ''
  const names = form.value.names.map((n) => n.value.trim()).filter((v) => v.length > 0)
  if (names.length === 0 || names.some((n) => n.length < 2)) {
    error.value = 'Enter each student\'s name (at least 2 characters).'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email.trim())) {
    error.value = 'Enter a valid parent email.'
    return
  }
  const phoneDigits = form.value.phone.replace(/\D/g, '')
  if (phoneDigits.length > 0 && phoneDigits.length < 10) {
    error.value = 'Enter a full 10-digit phone number, or leave it blank.'
    return
  }
  if (form.value.password.length < 6) {
    error.value = 'The password needs at least 6 characters.'
    return
  }
  submitting.value = true
  try {
    const data = await api.post('/api/student-auth/admin-register', {
      names,
      parentEmail: form.value.email.trim(),
      parentPhone: phoneDigits.length ? form.value.phone : null,
      password: form.value.password,
    })
    emit('registered', { students: data.students ?? [], parentEmail: form.value.email.trim() })
  } catch (err) {
    error.value = err.message
  } finally {
    submitting.value = false
  }
}

const inputClass =
  'w-full px-3 py-2.5 rounded-lg bg-white border border-navy-200 text-navy-800 font-body text-sm placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 disabled:opacity-50'
const labelClass = 'block font-body text-[10px] tracking-wider uppercase font-bold text-navy-500 mb-1.5'
</script>

<template>
  <Transition
    :duration="{ enter: 150, leave: 100 }"
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-100 ease-in pointer-events-none"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="show" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" @click.self="close">
      <div ref="panel" role="dialog" aria-modal="true" aria-labelledby="register-family-title" class="bg-white rounded-2xl shadow-2xl shadow-black/20 max-w-lg w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <div class="flex items-start justify-between gap-4 mb-5">
          <div class="min-w-0">
            <p class="font-body text-[10px] tracking-[0.2em] uppercase text-academic-600 font-bold mb-1">New family</p>
            <h2 id="register-family-title" class="font-heading text-2xl font-bold text-[#001B3D] tracking-tight leading-tight">Register a family</h2>
            <p class="font-body text-xs text-navy-500 mt-1.5 leading-relaxed">
              Students are added to the roster as approved. Siblings share one login.
            </p>
          </div>
          <button
            type="button"
            @click="close"
            aria-label="Close"
            class="p-1.5 -mt-1 -mr-1 rounded-lg text-navy-400 hover:bg-navy-50 hover:text-navy-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="error" role="alert" class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-body">
          {{ error }}
        </div>

        <form @submit.prevent="onSubmit" class="space-y-4" novalidate>
          <div class="space-y-3">
            <div v-for="(n, i) in form.names" :key="n.id">
              <label :for="`rf-name-${i}`" :class="labelClass">
                {{ form.names.length > 1 ? `Student ${i + 1} name` : 'Student name' }}
              </label>
              <div class="flex gap-2">
                <input
                  :id="`rf-name-${i}`"
                  v-model="n.value"
                  type="text"
                  autocomplete="off"
                  required
                  minlength="2"
                  maxlength="100"
                  :disabled="submitting"
                  placeholder="Student's full name"
                  :class="inputClass"
                />
                <button
                  v-if="form.names.length > 1"
                  type="button"
                  @click="removeName(i)"
                  :disabled="submitting"
                  :aria-label="`Remove student ${i + 1}`"
                  class="shrink-0 px-3 rounded-lg border border-navy-200 text-navy-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 focus:outline-none"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <button
              v-if="form.names.length < MAX_STUDENTS"
              type="button"
              @click="addName"
              :disabled="submitting"
              class="inline-flex items-center gap-1 font-body text-xs font-semibold text-academic-700 hover:text-academic-800 hover:underline underline-offset-2 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none rounded"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add a sibling
            </button>
            <p v-else class="font-body text-xs text-navy-400">Up to {{ MAX_STUDENTS }} students per family.</p>
            <p class="sr-only" role="status" aria-live="polite">{{ liveMsg }}</p>
          </div>

          <div>
            <label for="rf-email" :class="labelClass">Parent email</label>
            <input
              id="rf-email"
              v-model="form.email"
              type="email"
              autocomplete="off"
              required
              :disabled="submitting"
              placeholder="parent@example.com"
              :class="inputClass"
            />
            <p class="mt-1.5 font-body text-xs text-navy-400">The family logs in with this email.</p>
          </div>

          <div>
            <label for="rf-phone" :class="labelClass">
              Parent phone <span class="normal-case tracking-normal font-semibold text-navy-400">(optional)</span>
            </label>
            <input
              id="rf-phone"
              :value="form.phone"
              @input="onPhoneInput"
              type="tel"
              inputmode="tel"
              autocomplete="off"
              :disabled="submitting"
              placeholder="(504) 373-9778"
              :class="inputClass"
            />
          </div>

          <div>
            <label for="rf-password" :class="labelClass">Password</label>
            <div class="flex gap-2">
              <input
                id="rf-password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                required
                minlength="6"
                :disabled="submitting"
                placeholder="At least 6 characters"
                :class="inputClass"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                :aria-pressed="showPassword"
                :disabled="submitting"
                class="shrink-0 px-3 rounded-lg border border-navy-200 text-navy-600 hover:bg-navy-50 font-body text-xs font-semibold transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
            <p class="mt-1.5 font-body text-xs text-navy-400">Share this with the family along with the email.</p>
          </div>

          <div class="flex flex-wrap justify-end gap-3 pt-4 border-t border-navy-100">
            <button
              type="button"
              @click="close"
              :disabled="submitting"
              class="px-5 py-2.5 rounded-full border border-navy-200 text-navy-700 hover:bg-navy-50 text-sm font-body font-semibold transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#001B3D] text-white text-sm font-body font-semibold hover:bg-navy-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
            >
              <svg v-if="submitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ submitting ? 'Registering…' : 'Register family' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>
