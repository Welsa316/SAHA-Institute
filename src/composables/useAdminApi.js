import { useAdminAuth } from './useAdminAuth.js'

// Thin wrapper around fetch for the admin dashboard. Auto-handles 401s by clearing the
// session and routing to /admin/login, so individual views don't need to repeat that logic.

async function request(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  })

  if (res.status === 401) {
    const { logout } = useAdminAuth()
    await logout()
    // Best-effort hard redirect — we can't import the router here without circular deps.
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
      window.location.assign('/admin/login')
    }
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Session expired.')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

export function useAdminApi() {
  return {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
    patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
    delete: (path) => request(path, { method: 'DELETE' }),
  }
}
