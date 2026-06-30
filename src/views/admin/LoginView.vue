<script setup>
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAdminAuth } from '../../composables/useAdminAuth.js'

const router = useRouter()
const route = useRoute()
const { login, ensureChecked, isAuthenticated } = useAdminAuth()

const username = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

// If the session is already valid, skip the form and go straight to the dashboard.
onMounted(async () => {
  await ensureChecked()
  if (isAuthenticated.value) {
    router.replace(typeof route.query.next === 'string' ? route.query.next : '/admin')
  }
})

async function handleSubmit() {
  error.value = ''
  if (!username.value || !password.value) {
    error.value = 'Please enter your username and password.'
    return
  }
  submitting.value = true
  try {
    await login({ username: username.value.trim(), password: password.value })
    const next = typeof route.query.next === 'string' ? route.query.next : '/admin'
    router.replace(next)
  } catch (err) {
    error.value = err?.message || 'Could not sign in.'
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
        <p class="font-heading text-4xl font-extrabold tracking-tight text-academic-300 leading-none" style="font-family: 'Cormorant Garamond', serif;">
          SAHA
        </p>
        <p class="font-body text-[10px] tracking-[0.3em] uppercase text-white/40 font-medium mt-2">
          Admin Portal
        </p>
      </div>

      <div class="bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl shadow-black/30">
        <h1 class="font-heading text-2xl font-bold text-white tracking-tight mb-1">Sign in</h1>
        <p class="font-body text-sm text-white/50 mb-8">Enter your username and password.</p>

        <div v-if="error" class="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-400/30">
          <p class="font-body text-sm text-red-300">{{ error }}</p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <div>
            <label for="admin-username" class="block font-body text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
              Username
            </label>
            <input
              id="admin-username"
              v-model="username"
              type="text"
              autocomplete="username"
              required
              :disabled="submitting"
              class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-body text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 transition-all duration-300 disabled:opacity-50"
              placeholder="your username"
            />
          </div>

          <div>
            <label for="admin-password" class="block font-body text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              id="admin-password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
              :disabled="submitting"
              class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-body text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 transition-all duration-300 disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            :disabled="submitting"
            class="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-[#001B3D] font-body text-sm font-bold tracking-[0.15em] uppercase hover:bg-white/90 transition-colors duration-300 shadow-xl shadow-black/30 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus:outline-none"
          >
            <svg v-if="submitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ submitting ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
      </div>

      <p class="text-center mt-6 font-body text-xs text-white/30">
        Lost your password? Contact whoever set this up.
      </p>
    </div>
  </div>
</template>
