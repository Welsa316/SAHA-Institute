// Thin API client for the scheduling module. All calls go through the admin
// session cookie; teacher scoping is enforced server-side.

async function api(url, opts = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong.')
  return data
}

export function useSchedule() {
  return {
    fetchInstances(from, to, teacherId) {
      const q = new URLSearchParams({ from, to })
      if (teacherId) q.set('teacher_id', String(teacherId))
      return api(`/api/instances?${q.toString()}`).then((d) => d.instances)
    },
    fetchTeachers() {
      return api('/api/teachers').then((d) => d.teachers)
    },
    fetchStudents() {
      return api('/api/students').then((d) => d.students)
    },
    createEnrollment(body) {
      return api('/api/enrollments', { method: 'POST', body: JSON.stringify(body) })
    },
    cancelInstance(id) {
      return api(`/api/instances/${id}/cancel`, { method: 'POST' })
    },
    cancelStudentSchedule(studentId) {
      return api(`/api/students/${studentId}/cancel-schedule`, { method: 'POST' })
    },
    cancelDay(date) {
      return api('/api/schedule/cancel-day', { method: 'POST', body: JSON.stringify({ date }) })
    },
  }
}
