<script setup>
import { onMounted, ref } from 'vue'
import { useSchedule } from '../../composables/useSchedule.js'

const { fetchTeachers, createTeacher, regenerateInvite, resetTeacherPassword, cancelTeacherClasses, removeTeacher } = useSchedule()

// Same palette the env-var seeding uses, so UI-created teachers get on-brand
// calendar colours. New teachers default to the first colour not already taken.
const PALETTE = ['#3B82C4', '#E07A5F', '#5B9279', '#9B6BB0', '#D9A441', '#4C8DA6', '#C2557B', '#7A8B3A']

const teachers = ref([])
const loading = ref(false)
const error = ref('')

// Most recently generated link, shown in a copyable panel. kind drives the copy:
// 'invite' (set first password) vs 'reset' (set a new password).
const linkPanel = ref(null) // { name, url, kind: 'invite' | 'reset' }
const copied = ref(false)

const form = ref({ name: '', email: '', color: PALETTE[0] })
const formError = ref('')
const submitting = ref(false)

function nextColor(list) {
  const used = new Set(list.map((t) => (t.color || '').toUpperCase()))
  return PALETTE.find((c) => !used.has(c.toUpperCase())) || PALETTE[0]
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    teachers.value = await fetchTeachers()
    form.value.color = nextColor(teachers.value)
  } catch (err) {
    error.value = err?.message || 'Could not load teachers.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function inviteUrl(token) {
  return `${window.location.origin}/teacher-setup/${token}`
}

async function copyLink(url) {
  copied.value = false
  try {
    await navigator.clipboard.writeText(url)
    copied.value = true
    setTimeout(() => (copied.value = false), 2500)
  } catch {
    // Clipboard blocked (e.g. insecure context) — the panel still shows the
    // selectable URL for manual copy.
  }
}

async function submit() {
  formError.value = ''
  if (form.value.name.trim().length < 2) return (formError.value = 'Enter the teacher’s name.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email.trim())) return (formError.value = 'Enter a valid email.')
  submitting.value = true
  try {
    const { teacher, inviteToken } = await createTeacher({
      name: form.value.name.trim(),
      email: form.value.email.trim().toLowerCase(),
      color: form.value.color,
    })
    const url = inviteUrl(inviteToken)
    linkPanel.value = { name: teacher.name, url, kind: 'invite' }
    await copyLink(url)
    form.value = { name: '', email: '', color: PALETTE[0] }
    await load()
  } catch (err) {
    formError.value = err?.message || 'Could not add the teacher.'
  } finally {
    submitting.value = false
  }
}

const regenBusyId = ref(null)
async function copyExistingInvite(teacher) {
  regenBusyId.value = teacher.id
  try {
    const token = await regenerateInvite(teacher.id)
    const url = inviteUrl(token)
    linkPanel.value = { name: teacher.name, url, kind: 'invite' }
    await copyLink(url)
  } catch (err) {
    error.value = err?.message || 'Could not generate an invite link.'
  } finally {
    regenBusyId.value = null
  }
}

const resetBusyId = ref(null)
async function copyResetLink(teacher) {
  resetBusyId.value = teacher.id
  try {
    const token = await resetTeacherPassword(teacher.id)
    const url = inviteUrl(token)
    linkPanel.value = { name: teacher.name, url, kind: 'reset' }
    await copyLink(url)
  } catch (err) {
    error.value = err?.message || 'Could not generate a reset link.'
  } finally {
    resetBusyId.value = null
  }
}

// ---------- Remove teacher ----------
const removeTarget = ref(null)
const removeBusy = ref(false)
const removeBlockedCount = ref(null) // set when removal is blocked by upcoming classes
const removeNote = ref('')
const removeError = ref('')

function openRemove(teacher) {
  removeTarget.value = teacher
  removeBlockedCount.value = null
  removeNote.value = ''
  removeError.value = ''
}
function closeRemove() {
  removeTarget.value = null
}
async function doRemove() {
  removeBusy.value = true
  removeError.value = ''
  try {
    await removeTeacher(removeTarget.value.id)
    closeRemove()
    await load()
  } catch (err) {
    if (err?.status === 409 && err?.data?.upcomingCount) {
      removeBlockedCount.value = err.data.upcomingCount
    } else {
      removeError.value = err?.message || 'Could not remove the teacher.'
    }
  } finally {
    removeBusy.value = false
  }
}
async function doCancelClasses() {
  removeBusy.value = true
  removeError.value = ''
  try {
    const r = await cancelTeacherClasses(removeTarget.value.id)
    const n = r.instancesCancelled || 0
    const fam = r.studentsAffected || 0
    removeNote.value = `Cancelled ${n} class${n === 1 ? '' : 'es'}${fam ? ` — ${fam} famil${fam === 1 ? 'y' : 'ies'} emailed` : ''}.`
    removeBlockedCount.value = null
  } catch (err) {
    removeError.value = err?.message || 'Could not cancel the classes.'
  } finally {
    removeBusy.value = false
  }
}
</script>

<template>
  <div class="max-w-[1000px] mx-auto px-4 md:px-8 py-8">
    <div class="mb-6">
      <h1 class="font-heading text-2xl md:text-3xl font-extrabold text-navy-900 tracking-tight">Teachers</h1>
      <p class="font-body text-sm text-navy-500 mt-1">
        Add a teacher, then share their one-time invite link so they set their own password.
      </p>
    </div>

    <div v-if="error" role="alert" class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-body">{{ error }}</div>

    <!-- Link panel (after create / re-copy invite, or reset) -->
    <div v-if="linkPanel" class="mb-6 p-4 rounded-2xl border border-academic-300 bg-academic-50">
      <div class="flex items-start justify-between gap-3">
        <p class="font-body text-sm text-navy-700">
          {{ linkPanel.kind === 'reset' ? 'Password reset link' : 'Invite link' }} for
          <span class="font-bold">{{ linkPanel.name }}</span> — share it with them.
          <span class="text-navy-500">Works once, expires in {{ linkPanel.kind === 'reset' ? '24 hours' : '14 days' }}.</span>
        </p>
        <button type="button" @click="linkPanel = null" aria-label="Dismiss" class="text-navy-400 hover:text-navy-700 shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div class="flex gap-2 mt-3">
        <input
          :value="linkPanel.url"
          readonly
          @focus="(e) => e.target.select()"
          class="flex-1 px-3 py-2 rounded-lg border border-navy-200 bg-white font-mono text-xs text-navy-700 focus:outline-none focus:ring-2 focus:ring-academic-400/40"
        />
        <button type="button" @click="copyLink(linkPanel.url)" class="px-4 py-2 rounded-lg bg-[#001B3D] text-white hover:bg-navy-800 font-body text-sm font-bold whitespace-nowrap">
          {{ copied ? 'Copied!' : 'Copy link' }}
        </button>
      </div>
    </div>

    <!-- Add teacher -->
    <form @submit.prevent="submit" class="mb-8 p-5 rounded-2xl border border-navy-100 bg-white shadow-sm">
      <h2 class="font-heading text-lg font-bold text-navy-900 mb-4">Add a teacher</h2>
      <div v-if="formError" role="alert" class="mb-4 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-body">{{ formError }}</div>
      <div class="grid md:grid-cols-2 gap-4">
        <div>
          <label for="t-name" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Name</label>
          <input id="t-name" v-model="form.name" type="text" autocomplete="off" placeholder="Tahreem Fatima" class="w-full px-3 py-2.5 rounded-lg border border-navy-200 bg-white font-body text-sm text-navy-800 focus:outline-none focus:ring-2 focus:ring-academic-400/40" />
        </div>
        <div>
          <label for="t-email" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Email</label>
          <input id="t-email" v-model="form.email" type="email" autocomplete="off" placeholder="teacher@example.com" class="w-full px-3 py-2.5 rounded-lg border border-navy-200 bg-white font-body text-sm text-navy-800 focus:outline-none focus:ring-2 focus:ring-academic-400/40" />
          <p class="font-body text-[11px] text-navy-400 mt-1">They’ll log in with this email. Kept on file for future reminder emails.</p>
        </div>
      </div>
      <div class="mt-4">
        <label class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Calendar colour</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="c in PALETTE"
            :key="c"
            type="button"
            @click="form.color = c"
            :aria-label="`Colour ${c}`"
            :aria-pressed="form.color === c"
            class="w-8 h-8 rounded-full border-2 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
            :class="form.color === c ? 'border-navy-900 scale-110' : 'border-transparent hover:scale-105'"
            :style="{ backgroundColor: c }"
          ></button>
        </div>
      </div>
      <div class="mt-5">
        <button type="submit" :disabled="submitting" class="px-5 py-2.5 rounded-lg bg-[#001B3D] text-white hover:bg-navy-800 font-body text-sm font-bold transition-colors disabled:opacity-60">
          {{ submitting ? 'Adding…' : 'Add teacher & generate link' }}
        </button>
      </div>
    </form>

    <!-- Teacher list -->
    <div class="rounded-2xl border border-navy-100 bg-white shadow-sm overflow-hidden">
      <div v-if="loading" class="p-6 font-body text-sm text-navy-400">Loading…</div>
      <div v-else-if="!teachers.length" class="p-6 font-body text-sm text-navy-400">No teachers yet. Add one above.</div>
      <ul v-else class="divide-y divide-navy-100">
        <li v-for="t in teachers" :key="t.id" class="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 sm:px-5 py-4">
          <span class="w-4 h-4 rounded-full shrink-0" :style="{ backgroundColor: t.color }" :aria-hidden="true"></span>
          <div class="min-w-[8rem] flex-1">
            <p class="font-body text-sm font-bold text-navy-900 truncate">{{ t.name }}</p>
            <p class="font-body text-xs text-navy-500 truncate">{{ t.email || 'No email on file' }}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0 ml-auto">
            <span
              class="px-2.5 py-1 rounded-full font-body text-[11px] font-bold uppercase tracking-wide whitespace-nowrap"
              :class="t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'"
            >
              {{ t.status === 'active' ? 'Active' : 'Invite pending' }}
            </span>
            <button
              v-if="t.status === 'pending' && t.email"
              type="button"
              @click="copyExistingInvite(t)"
              :disabled="regenBusyId === t.id"
              class="px-3 py-1.5 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 font-body text-xs font-semibold whitespace-nowrap transition-colors disabled:opacity-60"
            >
              {{ regenBusyId === t.id ? '…' : 'Copy invite link' }}
            </button>
            <button
              v-if="t.status === 'active' && t.email"
              type="button"
              @click="copyResetLink(t)"
              :disabled="resetBusyId === t.id"
              class="px-3 py-1.5 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 font-body text-xs font-semibold whitespace-nowrap transition-colors disabled:opacity-60"
            >
              {{ resetBusyId === t.id ? '…' : 'Reset password' }}
            </button>
            <button
              type="button"
              @click="openRemove(t)"
              class="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-body text-xs font-semibold whitespace-nowrap transition-colors"
            >
              Remove
            </button>
          </div>
        </li>
      </ul>
    </div>

    <!-- Remove teacher modal -->
    <div v-if="removeTarget" class="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="Remove teacher" @keydown.esc="closeRemove">
      <div class="absolute inset-0 bg-black/40" @click="closeRemove"></div>
      <div class="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
        <h2 class="font-heading text-lg font-bold text-navy-900 mb-1">Remove {{ removeTarget.name }}?</h2>

        <div v-if="removeError" role="alert" class="my-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-body">{{ removeError }}</div>
        <div v-if="removeNote" class="my-3 p-2.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-body">{{ removeNote }}</div>
        <div v-if="!removeTarget.email" class="my-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-body">
          This teacher was set up via environment variables, so they'll reappear on the next deploy unless you also delete their <code class="font-mono">TEACHER…</code> variables in Railway.
        </div>

        <!-- Blocked: still has upcoming classes -->
        <template v-if="removeBlockedCount">
          <p class="font-body text-sm text-navy-600 my-4">
            <span class="font-semibold">{{ removeTarget.name }}</span> still has {{ removeBlockedCount }} upcoming class{{ removeBlockedCount === 1 ? '' : 'es' }}. Cancel them first — the affected families will be emailed.
          </p>
          <div class="flex gap-3">
            <button type="button" @click="closeRemove" class="flex-1 px-4 py-2.5 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 font-body text-sm font-semibold">Keep teacher</button>
            <button type="button" @click="doCancelClasses" :disabled="removeBusy" class="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 font-body text-sm font-bold disabled:opacity-60">
              {{ removeBusy ? 'Cancelling…' : `Cancel ${removeBlockedCount} class${removeBlockedCount === 1 ? '' : 'es'}` }}
            </button>
          </div>
        </template>

        <!-- Confirm remove -->
        <template v-else>
          <p class="font-body text-sm text-navy-600 my-4">
            This permanently deletes <span class="font-semibold">{{ removeTarget.name }}</span> and all their class records from the database. This can't be undone.
          </p>
          <div class="flex gap-3">
            <button type="button" @click="closeRemove" class="flex-1 px-4 py-2.5 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 font-body text-sm font-semibold">Cancel</button>
            <button type="button" @click="doRemove" :disabled="removeBusy" class="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-body text-sm font-bold disabled:opacity-60">
              {{ removeBusy ? 'Removing…' : 'Remove teacher' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
