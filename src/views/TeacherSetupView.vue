<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'

const route = useRoute()
const token = route.params.token

// Page state machine: loading → (valid form | invalid | used) → done.
const state = ref('loading') // 'loading' | 'valid' | 'invalid' | 'used' | 'done'
const mode = ref('invite') // 'invite' (first password) | 'reset' (new password)
const isReset = computed(() => mode.value === 'reset')
const teacherName = ref('')
const teacherEmail = ref('')

const password = ref('')
const confirm = ref('')
const error = ref('')
const submitting = ref(false)

const canSubmit = computed(() => password.value.length >= 8 && password.value === confirm.value)

onMounted(async () => {
  try {
    const res = await fetch(`/api/teacher-setup/${encodeURIComponent(token)}`)
    const data = await res.json().catch(() => ({}))
    mode.value = data.mode || 'invite'
    if (data.valid) {
      teacherName.value = data.name || ''
      teacherEmail.value = data.email || ''
      state.value = 'valid'
    } else if (data.reason === 'used') {
      teacherName.value = data.name || ''
      state.value = 'used'
    } else {
      state.value = 'invalid'
    }
  } catch {
    state.value = 'invalid'
  }
})

async function submit() {
  error.value = ''
  if (password.value.length < 8) return (error.value = 'Password must be at least 8 characters.')
  if (password.value !== confirm.value) return (error.value = 'Passwords don’t match.')
  submitting.value = true
  try {
    const res = await fetch('/api/teacher-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: password.value }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Could not set up your account.')
    state.value = 'done'
  } catch (err) {
    error.value = err?.message || 'Could not set up your account.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-[#001B3D] via-navy-900 to-[#001B3D] flex items-center justify-center px-6 py-12">
    <div class="absolute inset-0 pointer-events-none" style="background: radial-gradient(ellipse 60% 50% at 50% 30%, rgba(74,154,204,0.12) 0%, transparent 70%);"></div>

    <div class="relative w-full max-w-md">
      <div class="text-center mb-10">
        <p class="font-heading text-4xl font-extrabold tracking-tight text-academic-300 leading-none" style="font-family: 'Cormorant Garamond', serif;">SAHA</p>
        <p class="font-body text-[10px] tracking-[0.3em] uppercase text-white/40 font-medium mt-2">{{ isReset ? 'Password Reset' : 'Teacher Setup' }}</p>
      </div>

      <div class="bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl shadow-black/30">
        <!-- Loading -->
        <div v-if="state === 'loading'" class="py-8 text-center">
          <svg class="w-6 h-6 animate-spin mx-auto text-white/60" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <p class="font-body text-sm text-white/50 mt-4">Checking your link…</p>
        </div>

        <!-- Invalid / expired -->
        <div v-else-if="state === 'invalid'" class="text-center">
          <h1 class="font-heading text-2xl font-bold text-white mb-2">Link not valid</h1>
          <p class="font-body text-sm text-white/60 mb-6">This link is invalid or has expired. Ask the admin to send you a fresh one.</p>
          <RouterLink to="/admin/login" class="inline-block font-body text-sm text-academic-300 hover:text-academic-200 font-semibold">Go to sign in</RouterLink>
        </div>

        <!-- Already used -->
        <div v-else-if="state === 'used'" class="text-center">
          <h1 class="font-heading text-2xl font-bold text-white mb-2">{{ isReset ? 'Link already used' : 'Already set up' }}</h1>
          <p class="font-body text-sm text-white/60 mb-6">
            {{ isReset ? 'This reset link has already been used. Ask the admin for a new one if you still need to change your password.' : 'This account has already been set up. Just sign in with your email and password.' }}
          </p>
          <RouterLink to="/admin/login" class="inline-block font-body text-sm text-academic-300 hover:text-academic-200 font-semibold">Go to sign in</RouterLink>
        </div>

        <!-- Done -->
        <div v-else-if="state === 'done'" class="text-center">
          <div class="w-12 h-12 rounded-full bg-green-500/15 border border-green-400/30 flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 class="font-heading text-2xl font-bold text-white mb-2">{{ isReset ? 'Password updated' : 'You’re all set' }}</h1>
          <p class="font-body text-sm text-white/60 mb-6">{{ isReset ? 'Your password has been changed.' : 'Your account is ready.' }} Sign in with <span class="text-white/80">{{ teacherEmail }}</span> and your new password.</p>
          <RouterLink to="/admin/login" class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-[#001B3D] font-body text-sm font-bold tracking-[0.15em] uppercase hover:bg-white/90 transition-colors">Sign in</RouterLink>
        </div>

        <!-- Valid: set password -->
        <div v-else>
          <h1 class="font-heading text-2xl font-bold text-white tracking-tight mb-1">{{ isReset ? 'Reset your password' : `Welcome${teacherName ? `, ${teacherName.split(' ')[0]}` : ''}` }}</h1>
          <p class="font-body text-sm text-white/50 mb-8">Set a {{ isReset ? 'new ' : '' }}password for <span class="text-white/70">{{ teacherEmail }}</span>.</p>

          <div v-if="error" class="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-400/30">
            <p class="font-body text-sm text-red-300">{{ error }}</p>
          </div>

          <form @submit.prevent="submit" class="space-y-5">
            <div>
              <label for="ts-pw" class="block font-body text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Password</label>
              <input id="ts-pw" v-model="password" type="password" autocomplete="new-password" required :disabled="submitting" class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-body text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 transition-all disabled:opacity-50" placeholder="At least 8 characters" />
            </div>
            <div>
              <label for="ts-confirm" class="block font-body text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Confirm password</label>
              <input id="ts-confirm" v-model="confirm" type="password" autocomplete="new-password" required :disabled="submitting" class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-body text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 transition-all disabled:opacity-50" placeholder="Re-enter your password" />
            </div>
            <button type="submit" :disabled="submitting || !canSubmit" class="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-[#001B3D] font-body text-sm font-bold tracking-[0.15em] uppercase hover:bg-white/90 transition-colors shadow-xl shadow-black/30 disabled:opacity-60 disabled:cursor-not-allowed">
              <svg v-if="submitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              {{ submitting ? (isReset ? 'Updating…' : 'Setting up…') : (isReset ? 'Update password' : 'Create account') }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
