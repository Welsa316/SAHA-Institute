<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { DateTime } from 'luxon'
import { useAdminAuth } from '../../composables/useAdminAuth.js'
import { useSchedule } from '../../composables/useSchedule.js'

const { isAdmin, displayTimezone } = useAdminAuth()
const {
  fetchInstances,
  fetchTeachers,
  fetchStudents,
  createEnrollment,
  cancelInstance,
  cancelStudentSchedule,
  cancelDay,
} = useSchedule()

// Grid runs 8:00–21:00 (the institute's hours), one absolutely-positioned block
// per class so any start time / duration renders correctly.
const START_HOUR = 8
const END_HOUR = 21
const PX_PER_HOUR = 56
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const tz = computed(() => displayTimezone.value || 'America/Chicago')

// Monday of the week being viewed, in the user's display timezone.
const weekStart = ref(DateTime.now().setZone('America/Chicago').startOf('week'))
watch(tz, (z) => { weekStart.value = weekStart.value.setZone(z, { keepLocalTime: true }).startOf('week') })

const instances = ref([])
const teachers = ref([])
const students = ref([])
const loading = ref(false)
const error = ref('')
const teacherFilter = ref('') // '' = all (admin only)

const weekDays = computed(() => Array.from({ length: 5 }, (_, i) => weekStart.value.plus({ days: i })))
// Each hour 8..20 owns a slot; used for the subtle half-hour lines.
const hourRows = computed(() => Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i))
// Every labelled hour line, 8 AM through 9 PM inclusive, so the grid is bounded
// top and bottom by a labelled hour rather than a dangling unlabelled slot.
const hourRowsInclusive = computed(() => Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i))
// Interior hour separators only — 8 AM is the card's top border, 9 PM its bottom,
// so drawing lines there would double up with the border.
const interiorHours = computed(() => Array.from({ length: END_HOUR - START_HOUR - 1 }, (_, i) => START_HOUR + 1 + i))
const gridHeight = computed(() => (END_HOUR - START_HOUR) * PX_PER_HOUR)

function fmtHour(h) {
  return DateTime.fromObject({ hour: h }).toFormat('h a')
}
// Centre each hour label on its line, except the first/last, which tuck just
// inside the top/bottom edge so they're never clipped.
function hourLabelStyle(h) {
  const top = (h - START_HOUR) * PX_PER_HOUR + 'px'
  if (h === START_HOUR) return { top }
  if (h === END_HOUR) return { top, transform: 'translateY(-100%)' }
  return { top, transform: 'translateY(-50%)' }
}
const weekRangeLabel = computed(
  () => `${weekDays.value[0].toFormat('LLL d')} – ${weekDays.value[4].toFormat('LLL d, yyyy')}`,
)

function localOf(inst) {
  return DateTime.fromISO(inst.startsAtUtc, { zone: 'utc' }).setZone(tz.value)
}

// Greedy lane assignment: blocks that overlap in time get distinct columns and
// then share the day-column width side by side. Non-overlapping blocks stay full
// width. This matters most in the all-teachers view, where several teachers
// routinely run classes at the same hour. Sets _col (0-based lane) and _cols
// (lanes in this block's overlap group).
function layoutOverlaps(events) {
  const sorted = [...events].sort((a, b) => a._start - b._start || a._end - b._end)
  let i = 0
  while (i < sorted.length) {
    let j = i + 1
    let groupEnd = sorted[i]._end
    const group = [sorted[i]]
    while (j < sorted.length && sorted[j]._start < groupEnd) {
      group.push(sorted[j])
      groupEnd = Math.max(groupEnd, sorted[j]._end)
      j += 1
    }
    const laneEnds = []
    for (const ev of group) {
      let lane = laneEnds.findIndex((end) => end <= ev._start)
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(ev._end) }
      else laneEnds[lane] = ev._end
      ev._col = lane
    }
    for (const ev of group) ev._cols = laneEnds.length
    i = j
  }
  return sorted
}

// Instances grouped by weekday (1=Mon … 5=Fri) with grid geometry attached.
const instancesByDay = computed(() => {
  const byDay = { 1: [], 2: [], 3: [], 4: [], 5: [] }
  for (const inst of instances.value) {
    const local = localOf(inst)
    const wd = local.weekday
    if (wd < 1 || wd > 5) continue
    const startMin = local.hour * 60 + local.minute
    const top = (startMin / 60 - START_HOUR) * PX_PER_HOUR
    const height = Math.max((inst.durationMinutes / 60) * PX_PER_HOUR, 24)
    byDay[wd].push({
      ...inst,
      _start: startMin,
      _end: startMin + inst.durationMinutes,
      _top: top,
      _height: height,
      _timeLabel: local.toFormat('h:mm a'),
    })
  }
  for (const wd of [1, 2, 3, 4, 5]) byDay[wd] = layoutOverlaps(byDay[wd])
  return byDay
})

async function loadWeek() {
  loading.value = true
  error.value = ''
  try {
    const from = weekDays.value[0].toFormat('yyyy-MM-dd')
    const to = weekDays.value[4].toFormat('yyyy-MM-dd')
    instances.value = await fetchInstances(from, to, isAdmin.value ? teacherFilter.value || undefined : undefined)
  } catch (err) {
    error.value = err?.message || 'Could not load the calendar.'
  } finally {
    loading.value = false
  }
}

function prevWeek() { weekStart.value = weekStart.value.minus({ weeks: 1 }); loadWeek() }
function nextWeek() { weekStart.value = weekStart.value.plus({ weeks: 1 }); loadWeek() }
function thisWeek() { weekStart.value = DateTime.now().setZone(tz.value).startOf('week'); loadWeek() }

onMounted(async () => {
  if (isAdmin.value) {
    try {
      ;[teachers.value, students.value] = await Promise.all([fetchTeachers(), fetchStudents()])
    } catch (_err) { /* non-fatal — calendar still loads */ }
  }
  await loadWeek()
})

// ---------- New class form (admin) ----------
const showForm = ref(false)
const form = ref({ studentId: '', teacherId: '', days: [], startTime: '16:00', durationChoice: '60', customDuration: 45 })
const formError = ref('')
const formSubmitting = ref(false)

function openForm() {
  form.value = { studentId: '', teacherId: '', days: [], startTime: '16:00', durationChoice: '60', customDuration: 45 }
  formError.value = ''
  showForm.value = true
}
function toggleDay(d) {
  const i = form.value.days.indexOf(d)
  if (i === -1) form.value.days.push(d)
  else form.value.days.splice(i, 1)
}
const formDuration = computed(() =>
  form.value.durationChoice === 'custom' ? Number(form.value.customDuration) : Number(form.value.durationChoice),
)

async function submitForm() {
  formError.value = ''
  if (!form.value.studentId) return (formError.value = 'Pick a student.')
  if (!form.value.teacherId) return (formError.value = 'Pick a teacher.')
  if (form.value.days.length === 0) return (formError.value = 'Pick at least one weekday.')
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.value.startTime)) return (formError.value = 'Enter a valid start time.')
  if (!formDuration.value || formDuration.value < 5) return (formError.value = 'Enter a valid duration.')
  formSubmitting.value = true
  try {
    await createEnrollment({
      studentId: Number(form.value.studentId),
      teacherId: Number(form.value.teacherId),
      daysOfWeek: [...form.value.days].sort((a, b) => a - b),
      startTimeLocal: form.value.startTime,
      durationMinutes: formDuration.value,
      startDate: DateTime.now().setZone(tz.value).toFormat('yyyy-MM-dd'),
    })
    showForm.value = false
    await loadWeek()
  } catch (err) {
    formError.value = err?.message || 'Could not create the class.'
  } finally {
    formSubmitting.value = false
  }
}

// ---------- Cancel actions ----------
const cancelTarget = ref(null) // the clicked instance
const cancelBusy = ref(false)

function openCancel(inst) {
  if (inst.status === 'cancelled') return
  cancelTarget.value = inst
}
async function doCancelInstance() {
  cancelBusy.value = true
  try {
    await cancelInstance(cancelTarget.value.id)
    cancelTarget.value = null
    await loadWeek()
  } catch (err) {
    error.value = err?.message || 'Could not cancel.'
  } finally {
    cancelBusy.value = false
  }
}
async function doCancelStudentSchedule() {
  cancelBusy.value = true
  try {
    await cancelStudentSchedule(cancelTarget.value.studentId)
    cancelTarget.value = null
    await loadWeek()
  } catch (err) {
    error.value = err?.message || 'Could not cancel the schedule.'
  } finally {
    cancelBusy.value = false
  }
}

const showCloseDay = ref(false)
const closeDayDate = ref('')
const closeDayBusy = ref(false)
const closeDayError = ref('')
function openCloseDay() {
  closeDayDate.value = weekDays.value[0].toFormat('yyyy-MM-dd')
  closeDayError.value = ''
  showCloseDay.value = true
}
async function doCloseDay() {
  closeDayError.value = ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(closeDayDate.value)) return (closeDayError.value = 'Pick a date.')
  closeDayBusy.value = true
  try {
    await cancelDay(closeDayDate.value)
    showCloseDay.value = false
    await loadWeek()
  } catch (err) {
    closeDayError.value = err?.message || 'Could not close the day.'
  } finally {
    closeDayBusy.value = false
  }
}

// A block is cancellable by this user if it's scheduled (teachers can only reach
// their own via the API, which the server enforces; admins can cancel any).
function canCancel(inst) {
  return inst.status === 'scheduled'
}
</script>

<template>
  <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 class="font-heading text-2xl md:text-3xl font-extrabold text-navy-900 tracking-tight">Schedule</h1>
        <p class="font-body text-sm text-navy-500 mt-1">
          {{ isAdmin ? 'Master calendar — all teachers.' : 'Your weekly calendar.' }}
          <span class="text-navy-400">Times shown in {{ tz.replace('America/', '').replace('_', ' ') }} (Central).</span>
        </p>
      </div>
      <div v-if="isAdmin" class="flex flex-wrap items-center gap-2">
        <select
          v-model="teacherFilter"
          @change="loadWeek"
          class="px-3 py-2 rounded-lg border border-navy-200 bg-white font-body text-sm text-navy-700 focus:outline-none focus:ring-2 focus:ring-academic-400/40"
        >
          <option value="">All teachers</option>
          <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
        <button
          type="button"
          @click="openCloseDay"
          class="px-4 py-2 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 font-body text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
        >
          Close a day
        </button>
        <button
          type="button"
          @click="openForm"
          class="px-4 py-2 rounded-lg bg-[#001B3D] text-white hover:bg-navy-800 font-body text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
        >
          + New class
        </button>
      </div>
    </div>

    <!-- Week nav -->
    <div class="flex items-center gap-3 mb-4">
      <button type="button" @click="prevWeek" aria-label="Previous week" class="w-9 h-9 rounded-lg border border-navy-200 text-navy-600 hover:bg-navy-50 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button type="button" @click="thisWeek" class="px-3 py-2 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 font-body text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none">Today</button>
      <button type="button" @click="nextWeek" aria-label="Next week" class="w-9 h-9 rounded-lg border border-navy-200 text-navy-600 hover:bg-navy-50 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
      </button>
      <p class="font-body text-sm font-semibold text-navy-700 tabular-nums">{{ weekRangeLabel }}</p>
      <span v-if="loading" class="font-body text-xs text-navy-400">Loading…</span>
    </div>

    <div v-if="error" role="alert" class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-body">{{ error }}</div>

    <!-- Calendar grid -->
    <div class="rounded-2xl border border-navy-100 bg-white overflow-x-auto shadow-sm">
      <div class="min-w-[760px]">
        <!-- Day headers -->
        <div class="grid" style="grid-template-columns: 64px repeat(5, 1fr)">
          <div class="border-b border-navy-100"></div>
          <div
            v-for="(day, i) in weekDays"
            :key="i"
            class="border-b border-l border-navy-100 px-3 py-2 text-center"
          >
            <p class="font-body text-[11px] tracking-[0.15em] uppercase text-navy-500 font-bold">{{ WEEKDAY_LABELS[i] }}</p>
            <p class="font-body text-sm font-semibold text-navy-800 tabular-nums">{{ day.toFormat('MMM d') }}</p>
          </div>
        </div>
        <!-- Body: time gutter + 5 day columns -->
        <div class="grid" style="grid-template-columns: 64px repeat(5, 1fr)">
          <!-- gutter -->
          <div class="relative" :style="{ height: gridHeight + 'px' }">
            <div
              v-for="h in hourRowsInclusive"
              :key="h"
              class="absolute right-2 font-body text-[11px] leading-none text-navy-400 tabular-nums"
              :style="hourLabelStyle(h)"
            >
              {{ fmtHour(h) }}
            </div>
          </div>
          <!-- day columns -->
          <div
            v-for="wd in [1, 2, 3, 4, 5]"
            :key="wd"
            class="relative border-l border-navy-100 bg-academic-50/20"
            :style="{ height: gridHeight + 'px' }"
          >
            <!-- half-hour gridlines (faint, for reading :30 starts) -->
            <div
              v-for="h in hourRows"
              :key="'half-' + h"
              class="absolute left-0 right-0 border-t border-navy-50"
              :style="{ top: (h - START_HOUR) * PX_PER_HOUR + PX_PER_HOUR / 2 + 'px' }"
            ></div>
            <!-- hour gridlines (interior only; 8 AM / 9 PM are the card edges) -->
            <div
              v-for="h in interiorHours"
              :key="'hour-' + h"
              class="absolute left-0 right-0 border-t border-navy-100"
              :style="{ top: (h - START_HOUR) * PX_PER_HOUR + 'px' }"
            ></div>
            <!-- class blocks -->
            <button
              v-for="inst in instancesByDay[wd]"
              :key="inst.id"
              type="button"
              @click="openCancel(inst)"
              :disabled="!canCancel(inst)"
              class="absolute rounded-lg px-2 py-1 text-left overflow-hidden transition-shadow focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-academic-500 focus:outline-none"
              :class="inst.status === 'cancelled' ? 'opacity-50 cursor-default' : 'hover:shadow-md cursor-pointer'"
              :style="{
                top: inst._top + 'px',
                height: inst._height + 'px',
                left: `calc(${(inst._col / inst._cols) * 100}% + 2px)`,
                width: `calc(${(1 / inst._cols) * 100}% - 4px)`,
                backgroundColor: inst.status === 'cancelled' ? '#E5E7EB' : inst.teacherColor + '26',
                borderLeft: `3px solid ${inst.status === 'cancelled' ? '#9CA3AF' : inst.teacherColor}`,
              }"
              :title="`${inst.studentName} · ${inst.teacherName} · ${inst._timeLabel}`"
            >
              <p
                class="font-body text-[12px] font-bold leading-tight truncate"
                :class="inst.status === 'cancelled' ? 'text-navy-400 line-through' : 'text-navy-900'"
              >
                {{ inst.studentName }}
              </p>
              <p class="font-body text-[10px] leading-tight truncate" :class="inst.status === 'cancelled' ? 'text-navy-400' : 'text-navy-600'">
                {{ inst._timeLabel }}<span v-if="isAdmin"> · {{ inst.teacherName }}</span>
              </p>
              <p v-if="inst.status === 'cancelled'" class="font-body text-[9px] uppercase tracking-wide text-red-500 font-bold">Cancelled</p>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Teacher colour legend (admin) -->
    <div v-if="isAdmin && teachers.length" class="flex flex-wrap items-center gap-4 mt-4">
      <div v-for="t in teachers" :key="t.id" class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-sm" :style="{ backgroundColor: t.color }"></span>
        <span class="font-body text-xs text-navy-600">{{ t.name }}</span>
      </div>
    </div>

    <!-- New class modal (admin) -->
    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="New recurring class" @keydown.esc="showForm = false">
      <div class="absolute inset-0 bg-black/40" @click="showForm = false"></div>
      <div class="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 md:p-7 max-h-[90vh] overflow-y-auto">
        <h2 class="font-heading text-xl font-bold text-navy-900 mb-1">New recurring class</h2>
        <p class="font-body text-xs text-navy-500 mb-5">Generates classes for 6 months. Same start time on every selected weekday.</p>
        <div v-if="formError" role="alert" class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-body">{{ formError }}</div>
        <form @submit.prevent="submitForm" class="space-y-4">
          <div>
            <label class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Student</label>
            <select v-model="form.studentId" class="w-full px-3 py-2.5 rounded-lg border border-navy-200 bg-white font-body text-sm text-navy-800 focus:outline-none focus:ring-2 focus:ring-academic-400/40">
              <option value="" disabled>Select a student…</option>
              <option v-for="s in students" :key="s.id" :value="s.id">{{ s.studentName }}</option>
            </select>
          </div>
          <div>
            <label class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Teacher</label>
            <select v-model="form.teacherId" class="w-full px-3 py-2.5 rounded-lg border border-navy-200 bg-white font-body text-sm text-navy-800 focus:outline-none focus:ring-2 focus:ring-academic-400/40">
              <option value="" disabled>Select a teacher…</option>
              <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div>
            <label class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Weekdays</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(label, i) in WEEKDAY_LABELS"
                :key="i"
                type="button"
                @click="toggleDay(i + 1)"
                class="px-3.5 py-2 rounded-lg border font-body text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
                :class="form.days.includes(i + 1) ? 'bg-academic-500 border-academic-500 text-white' : 'bg-white border-navy-200 text-navy-600 hover:bg-navy-50'"
              >
                {{ label }}
              </button>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="sf-time" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Start (Central)</label>
              <input id="sf-time" v-model="form.startTime" type="time" class="w-full px-3 py-2.5 rounded-lg border border-navy-200 bg-white font-body text-sm text-navy-800 focus:outline-none focus:ring-2 focus:ring-academic-400/40" />
            </div>
            <div>
              <label class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Duration</label>
              <div class="flex gap-1.5">
                <button v-for="d in ['30', '60', '120']" :key="d" type="button" @click="form.durationChoice = d"
                  class="flex-1 px-2 py-2.5 rounded-lg border font-body text-xs font-semibold transition-colors"
                  :class="form.durationChoice === d ? 'bg-academic-500 border-academic-500 text-white' : 'bg-white border-navy-200 text-navy-600 hover:bg-navy-50'">{{ d }}m</button>
                <button type="button" @click="form.durationChoice = 'custom'"
                  class="flex-1 px-2 py-2.5 rounded-lg border font-body text-xs font-semibold transition-colors"
                  :class="form.durationChoice === 'custom' ? 'bg-academic-500 border-academic-500 text-white' : 'bg-white border-navy-200 text-navy-600 hover:bg-navy-50'">Custom</button>
              </div>
              <input v-if="form.durationChoice === 'custom'" v-model.number="form.customDuration" type="number" min="5" max="600" class="mt-2 w-full px-3 py-2 rounded-lg border border-navy-200 bg-white font-body text-sm text-navy-800 focus:outline-none focus:ring-2 focus:ring-academic-400/40" placeholder="minutes" />
            </div>
          </div>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="showForm = false" class="flex-1 px-4 py-2.5 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 font-body text-sm font-semibold">Cancel</button>
            <button type="submit" :disabled="formSubmitting" class="flex-1 px-4 py-2.5 rounded-lg bg-[#001B3D] text-white hover:bg-navy-800 font-body text-sm font-bold disabled:opacity-60">{{ formSubmitting ? 'Creating…' : 'Create class' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Cancel instance modal -->
    <div v-if="cancelTarget" class="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="Cancel class" @keydown.esc="cancelTarget = null">
      <div class="absolute inset-0 bg-black/40" @click="cancelTarget = null"></div>
      <div class="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <h2 class="font-heading text-lg font-bold text-navy-900 mb-1">Cancel class</h2>
        <p class="font-body text-sm text-navy-600 mb-5">
          <span class="font-semibold">{{ cancelTarget.studentName }}</span> · {{ cancelTarget._timeLabel }}<span v-if="isAdmin"> · {{ cancelTarget.teacherName }}</span>
        </p>
        <div class="space-y-2">
          <button type="button" @click="doCancelInstance" :disabled="cancelBusy" class="w-full px-4 py-2.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 font-body text-sm font-bold disabled:opacity-60">Cancel just this class</button>
          <button v-if="isAdmin" type="button" @click="doCancelStudentSchedule" :disabled="cancelBusy" class="w-full px-4 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-body text-sm font-bold disabled:opacity-60">Cancel {{ cancelTarget.studentName }}'s entire schedule</button>
          <button type="button" @click="cancelTarget = null" class="w-full px-4 py-2.5 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 font-body text-sm font-semibold">Keep it</button>
        </div>
      </div>
    </div>

    <!-- Close-a-day modal (admin) -->
    <div v-if="showCloseDay" class="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="Close a day" @keydown.esc="showCloseDay = false">
      <div class="absolute inset-0 bg-black/40" @click="showCloseDay = false"></div>
      <div class="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <h2 class="font-heading text-lg font-bold text-navy-900 mb-1">Close a day</h2>
        <p class="font-body text-xs text-navy-500 mb-4">Cancels every class on this date, across all teachers (emergency closure).</p>
        <div v-if="closeDayError" role="alert" class="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-body">{{ closeDayError }}</div>
        <input v-model="closeDayDate" type="date" class="w-full px-3 py-2.5 rounded-lg border border-navy-200 bg-white font-body text-sm text-navy-800 mb-4 focus:outline-none focus:ring-2 focus:ring-academic-400/40" />
        <div class="flex gap-3">
          <button type="button" @click="showCloseDay = false" class="flex-1 px-4 py-2.5 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 font-body text-sm font-semibold">Cancel</button>
          <button type="button" @click="doCloseDay" :disabled="closeDayBusy" class="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-body text-sm font-bold disabled:opacity-60">{{ closeDayBusy ? 'Closing…' : 'Close day' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
