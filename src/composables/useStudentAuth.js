import { ref, computed } from 'vue'

// Shared reactive student-account session state. Mirror of useAdminAuth but
// hitting /api/student-auth and tracking a `student` object instead of an
// admin `user`. Imported by the auth page, the portal, and the router guard.

const student = ref(null)
const checking = ref(false)
const checked = ref(false)

async function fetchSession() {
  checking.value = true
  try {
    const res = await fetch('/api/student-auth/me', { credentials: 'same-origin' })
    if (res.ok) {
      const data = await res.json()
      student.value = data.student ?? null
    } else {
      student.value = null
    }
  } catch (_err) {
    student.value = null
  } finally {
    checking.value = false
    checked.value = true
  }
}

async function ensureChecked() {
  if (!checked.value && !checking.value) {
    await fetchSession()
  } else if (checking.value) {
    while (checking.value) {
      await new Promise((r) => setTimeout(r, 25))
    }
  }
}

async function signup({ name, email, password }) {
  const res = await fetch('/api/student-auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ name, email, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Could not create your account.')
  }
  student.value = data.student
  checked.value = true
  return data.student
}

async function login({ email, password }) {
  const res = await fetch('/api/student-auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Could not log in.')
  }
  student.value = data.student
  checked.value = true
  return data.student
}

async function logout() {
  try {
    await fetch('/api/student-auth/logout', { method: 'POST', credentials: 'same-origin' })
  } catch (_err) {
    // Clear local state regardless.
  }
  student.value = null
  checked.value = true
}

export function useStudentAuth() {
  return {
    student: computed(() => student.value),
    checking: computed(() => checking.value),
    checked: computed(() => checked.value),
    isAuthenticated: computed(() => !!student.value),
    fetchSession,
    ensureChecked,
    signup,
    login,
    logout,
  }
}
