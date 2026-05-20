import { ref, computed } from 'vue'

// Shared reactive admin session state. Imported by the admin layout, the login view,
// and the router guard so they all see the same user/loading/error state.

const user = ref(null)
const checking = ref(false)
const checked = ref(false)

async function fetchSession() {
  checking.value = true
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' })
    if (res.ok) {
      const data = await res.json()
      user.value = data.user ?? null
    } else {
      user.value = null
    }
  } catch (_err) {
    user.value = null
  } finally {
    checking.value = false
    checked.value = true
  }
}

async function ensureChecked() {
  if (!checked.value && !checking.value) {
    await fetchSession()
  } else if (checking.value) {
    // Wait until in-flight check completes
    while (checking.value) {
      await new Promise((r) => setTimeout(r, 25))
    }
  }
}

async function login({ email, password }) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = data.error || 'Could not sign in.'
    throw new Error(message)
  }
  user.value = data.user
  checked.value = true
  return data.user
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
  } catch (_err) {
    // Even if the call fails (e.g. network), clear local state.
  }
  user.value = null
  checked.value = true
}

export function useAdminAuth() {
  return {
    user: computed(() => user.value),
    checking: computed(() => checking.value),
    checked: computed(() => checked.value),
    isAuthenticated: computed(() => !!user.value),
    fetchSession,
    ensureChecked,
    login,
    logout,
  }
}
