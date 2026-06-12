import { ref, computed } from 'vue'

// Shared reactive FAMILY-account session state. One login (parent email +
// password) covers one or more students; `account` is { parentEmail,
// students: [{id, name, approved, gradeLevel}] }. Used by the auth pages,
// the portal, and the router guard.

const account = ref(null)
const checking = ref(false)
const checked = ref(false)

async function fetchSession() {
  checking.value = true
  try {
    const res = await fetch('/api/student-auth/me', { credentials: 'same-origin' })
    account.value = res.ok ? (await res.json()).account ?? null : null
  } catch (_err) {
    account.value = null
  } finally {
    checking.value = false
    checked.value = true
  }
}

async function ensureChecked() {
  if (!checked.value && !checking.value) {
    await fetchSession()
  } else if (checking.value) {
    while (checking.value) await new Promise((r) => setTimeout(r, 25))
  }
}

async function register({ names, parentEmail, parentPhone, password }) {
  const res = await fetch('/api/student-auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ names, parentEmail, parentPhone, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not create your account.')
  account.value = data.account
  checked.value = true
  return data.account
}

async function login({ email, password }) {
  const res = await fetch('/api/student-auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not log in.')
  account.value = data.account
  checked.value = true
  return data.account
}

async function logout() {
  try {
    await fetch('/api/student-auth/logout', { method: 'POST', credentials: 'same-origin' })
  } catch (_err) {
    // Clear local state regardless.
  }
  account.value = null
  checked.value = true
}

export function useStudentAuth() {
  return {
    account: computed(() => account.value),
    checking: computed(() => checking.value),
    checked: computed(() => checked.value),
    isAuthenticated: computed(() => !!account.value),
    fetchSession,
    ensureChecked,
    register,
    login,
    logout,
  }
}
