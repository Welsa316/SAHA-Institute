<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
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
  rescheduleInstance,
  rescheduleEnrollment,
  cancelStudentSchedule,
  cancelDay,
} = useSchedule()

// ---------- Modal accessibility ----------
// Only one dialog is open at a time, so a single panel ref serves all of them.
// On open: remember the trigger and move focus INTO the panel (which also makes
// the panel's Esc handler reachable). While open: Tab is trapped inside. On
// close: focus returns to the trigger.
const modalPanel = ref(null)
let lastFocused = null
function focusModal() {
  lastFocused = document.activeElement
  nextTick(() => modalPanel.value?.focus())
}
function restoreFocus() {
  const el = lastFocused
  lastFocused = null
  if (el && typeof el.focus === 'function') nextTick(() => el.focus())
}
function trapTab(e) {
  if (e.key !== 'Tab') return
  const panel = modalPanel.value
  if (!panel) return
  const focusables = [...panel.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((el) => el.offsetParent !== null)
  if (!focusables.length) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

// Grid runs 15:00–21:00 — it's an after-school institute, so classes start at
// 3pm. One absolutely-positioned block per class so any start time / duration
// renders correctly.
// The board canvas spans BOTH opening windows: weekdays run 3-9 PM and
// weekends 2-6 PM, so the grid covers 2 PM-9 PM and shades the hours each
// day is closed. Keep in lockstep with server/lib/hours.ts.
const START_HOUR = 14
const END_HOUR = 21
const HOURS = END_HOUR - START_HOUR
// Each day is its own card; this is the card header (weekday + date) height,
// which the time gutter mirrors as a top spacer so hour labels line up.
const HEADER_PX = 64
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Opening hours per weekday (1=Mon … 7=Sun), mirroring server/lib/hours.ts.
const WEEKEND_DAYS = new Set([6, 7])
const openWindowFor = (wd) => (WEEKEND_DAYS.has(wd) ? { open: 14, close: 18 } : { open: 15, close: 21 })
const fmtWindow = (wd) => {
  const { open, close } = openWindowFor(wd)
  const h = (x) => (x % 12 === 0 ? 12 : x % 12)
  return `${h(open)}-${h(close)} ${close > 12 ? 'PM' : 'AM'}`
}

// The board fills the viewport: px-per-hour is derived from the space left
// below the toolbar, clamped so short laptops stay usable and huge monitors
// don't stretch absurdly. Blocks reposition reactively when it changes.
const gridShellRef = ref(null)
const pxPerHour = ref(84)
function sizeGrid() {
  const el = gridShellRef.value
  if (!el) return
  const top = el.getBoundingClientRect().top
  const avail = window.innerHeight - top - 56 // legend row + breathing room
  pxPerHour.value = Math.round(Math.min(136, Math.max(64, (avail - HEADER_PX) / HOURS)))
}

const tz = computed(() => displayTimezone.value || 'America/Chicago')

// Monday of the week being viewed, in the user's display timezone.
const weekStart = ref(DateTime.now().setZone('America/Chicago').startOf('week'))
watch(tz, (z) => { weekStart.value = weekStart.value.setZone(z, { keepLocalTime: true }).startOf('week') })

// ---------- Week / Month view ----------
const view = ref('week') // 'week' | 'month'
const monthStart = ref(DateTime.now().setZone('America/Chicago').startOf('month'))

function setView(v) {
  if (view.value === v) return
  view.value = v
  try { localStorage.setItem('saha-schedule-view', v) } catch { /* private mode */ }
  instances.value = []
  if (v === 'week') loadWeek()
  else loadMonth()
}

const instances = ref([])
const teachers = ref([])
const students = ref([])
const loading = ref(false)
const error = ref('')
const teacherFilter = ref('') // '' = all (admin only)

const weekDays = computed(() => Array.from({ length: 7 }, (_, i) => weekStart.value.plus({ days: i })))
// Each hour 15..20 owns a slot; used for zebra bands + half-hour lines.
// The shaded parts of the canvas where a given weekday is closed.
// Mirrors checkWithinHours on the server: does a class of `mins` starting at
// 'HH:mm' fit inside that weekday's window? Returns a message or ''.
function hoursProblem(days, startTime, mins) {
  const [h, m] = startTime.split(':').map(Number)
  const start = h * 60 + m
  for (const wd of [...days].sort((a, b) => a - b)) {
    const { open, close } = openWindowFor(wd)
    if (start < open * 60 || start + mins > close * 60) {
      return `${WEEKDAY_LABELS[wd - 1]} runs ${fmtWindow(wd)} — a ${mins}-minute class at ${startTime} doesn't fit.`
    }
  }
  return ''
}

function closedBands(wd) {
  const { open, close } = openWindowFor(wd)
  const bands = []
  if (open > START_HOUR) bands.push({ top: 0, height: (open - START_HOUR) * pxPerHour.value })
  if (close < END_HOUR) {
    bands.push({
      top: (close - START_HOUR) * pxPerHour.value,
      height: (END_HOUR - close) * pxPerHour.value,
    })
  }
  return bands
}

const hourRows = computed(() => Array.from({ length: HOURS }, (_, i) => START_HOUR + i))
// Every labelled hour line, 3 PM through 9 PM inclusive, so the grid is bounded
// top and bottom by a labelled hour rather than a dangling unlabelled slot.
const hourRowsInclusive = computed(() => Array.from({ length: HOURS + 1 }, (_, i) => START_HOUR + i))
// Interior hour separators only — 3 PM is the card's top border, 9 PM its bottom.
const interiorHours = computed(() => Array.from({ length: HOURS - 1 }, (_, i) => START_HOUR + 1 + i))
// Alternate hour bands (4-5pm, 6-7pm, 8-9pm) get a whisper of tint so the eye
// can count hours across all five day cards at a glance.
const zebraHours = computed(() => hourRows.value.filter((_, i) => i % 2 === 1))
const gridHeight = computed(() => HOURS * pxPerHour.value)

function fmtHour(h) {
  return DateTime.fromObject({ hour: h }).toFormat('h a')
}
// Centre each hour label on its line (offset by the card-header spacer), except
// the first/last, which tuck just inside the top/bottom edge so they never clip.
function hourLabelStyle(h) {
  const top = HEADER_PX + (h - START_HOUR) * pxPerHour.value + 'px'
  if (h === START_HOUR) return { top }
  if (h === END_HOUR) return { top, transform: 'translateY(-100%)' }
  return { top, transform: 'translateY(-50%)' }
}
const weekRangeLabel = computed(
  () => `${weekDays.value[0].toFormat('LLL d')} – ${weekDays.value[6].toFormat('LLL d, yyyy')}`,
)

// ---------- "Now" line ----------
// A minute-ticking clock so today's card carries a live time indicator during
// teaching hours. Instantly orients "where are we in the day".
const nowTick = ref(DateTime.now().setZone('America/Chicago'))
let nowTimer = null

function isToday(day) {
  return day.hasSame(nowTick.value, 'day')
}
const nowOffset = computed(() => {
  const n = nowTick.value.setZone(tz.value)
  const mins = n.hour * 60 + n.minute
  if (mins < START_HOUR * 60 || mins > END_HOUR * 60) return null
  return ((mins - START_HOUR * 60) / 60) * pxPerHour.value
})

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

// Instances grouped by weekday (1=Mon … 7=Sun) with grid geometry attached.
const instancesByDay = computed(() => {
  const byDay = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] }
  for (const inst of instances.value) {
    const local = localOf(inst)
    const wd = local.weekday
    if (wd < 1 || wd > 7) continue
    const startMin = local.hour * 60 + local.minute
    const gh = HOURS * pxPerHour.value
    const rawTop = (startMin / 60 - START_HOUR) * pxPerHour.value
    const height = Math.min(Math.max((inst.durationMinutes / 60) * pxPerHour.value, 26), gh)
    // Clamp into the 2 PM–9 PM canvas so an out-of-window class (legacy data or
    // a non-Central display timezone) pins to the edge instead of painting over
    // the card header or vanishing while still being counted.
    const top = Math.min(Math.max(rawTop, 0), gh - height)
    const ends = local.plus({ minutes: inst.durationMinutes })
    byDay[wd].push({
      ...inst,
      // Lane assignment works in PIXEL space so the 26px minimum height also
      // pushes clamped/short back-to-back blocks into side-by-side lanes
      // instead of letting them paint over each other.
      _start: top,
      _end: top + height,
      _top: top,
      _height: height,
      _timeLabel: local.toFormat('h:mm a'),
      _timeRange: `${local.toFormat('h:mm')} – ${ends.toFormat('h:mm a')}`,
    })
  }
  for (const wd of [1, 2, 3, 4, 5]) byDay[wd] = layoutOverlaps(byDay[wd])
  return byDay
})

// True only after at least one successful fetch — the "every slot is open"
// note must never show during the initial load or alongside a fetch error.
const hasLoaded = ref(false)

async function loadWeek() {
  loading.value = true
  error.value = ''
  try {
    const from = weekDays.value[0].toFormat('yyyy-MM-dd')
    const to = weekDays.value[6].toFormat('yyyy-MM-dd')
    instances.value = await fetchInstances(from, to, isAdmin.value ? teacherFilter.value || undefined : undefined)
    hasLoaded.value = true
  } catch (err) {
    error.value = err?.message || 'Could not load the calendar.'
  } finally {
    loading.value = false
  }
}

// The month grid spans whole Mon–Sun weeks: from the Monday of the week
// containing the 1st through the Friday of the week containing the last day.
const monthWeeks = computed(() => {
  const weeks = []
  let d = monthStart.value.startOf('week')
  const last = monthStart.value.endOf('month')
  while (d <= last) {
    weeks.push(Array.from({ length: 7 }, (_, i) => d.plus({ days: i })))
    d = d.plus({ weeks: 1 })
  }
  return weeks
})

// Month cells show at most this many class chips before "+N more".
const MONTH_MAX_CHIPS = 3

// Instances keyed by local calendar date, sorted by start time — the month
// grid's data shape. Carries the same _timeLabel/_timeRange the manage modal
// reads, so a chip click opens the exact same flow as a week block.
const instancesByDate = computed(() => {
  const map = {}
  for (const inst of instances.value) {
    const local = localOf(inst)
    const ends = local.plus({ minutes: inst.durationMinutes })
    const key = local.toISODate()
    if (!map[key]) map[key] = []
    map[key].push({
      ...inst,
      _sort: local.toMillis(),
      _timeLabel: local.toFormat('h:mm a'),
      _timeRange: `${local.toFormat('h:mm')} – ${ends.toFormat('h:mm a')}`,
      _chipTime: local.toFormat('h:mm'),
    })
  }
  for (const k in map) map[k].sort((a, b) => a._sort - b._sort)
  return map
})

async function loadMonth() {
  loading.value = true
  error.value = ''
  try {
    const from = monthStart.value.startOf('week').toISODate()
    const to = monthStart.value.endOf('month').startOf('week').plus({ days: 4 }).toISODate()
    instances.value = await fetchInstances(from, to, isAdmin.value ? teacherFilter.value || undefined : undefined)
    hasLoaded.value = true
  } catch (err) {
    error.value = err?.message || 'Could not load the calendar.'
  } finally {
    loading.value = false
  }
}

function reload() {
  if (view.value === 'week') loadWeek()
  else loadMonth()
}

// Period nav clears the board first so the old period's blocks don't repaint
// under the new headers and then jump again when the fetch lands.
function prevPeriod() {
  instances.value = []
  if (view.value === 'week') { weekStart.value = weekStart.value.minus({ weeks: 1 }); loadWeek() }
  else { monthStart.value = monthStart.value.minus({ months: 1 }); loadMonth() }
}
function nextPeriod() {
  instances.value = []
  if (view.value === 'week') { weekStart.value = weekStart.value.plus({ weeks: 1 }); loadWeek() }
  else { monthStart.value = monthStart.value.plus({ months: 1 }); loadMonth() }
}
function goToday() {
  instances.value = []
  weekStart.value = DateTime.now().setZone(tz.value).startOf('week')
  monthStart.value = DateTime.now().setZone(tz.value).startOf('month')
  reload()
}

// "+N more" in a month cell drills into that day's week.
function gotoWeekOf(day) {
  weekStart.value = day.startOf('week')
  view.value = 'week'
  try { localStorage.setItem('saha-schedule-view', 'week') } catch { /* private mode */ }
  instances.value = []
  loadWeek()
}

const rangeLabel = computed(() =>
  view.value === 'week' ? weekRangeLabel.value : monthStart.value.toFormat('LLLL yyyy'),
)

// The class form's student + teacher pickers. Loaded independently (one failing
// must not blank the other) and re-loadable, so a transient hiccup or a session
// that resolves admin after mount never leaves the form with empty dropdowns.
const lookupsLoading = ref(false)
const lookupsError = ref(false)
async function loadLookups() {
  if (!isAdmin.value) return
  lookupsLoading.value = true
  lookupsError.value = false
  const [t, s] = await Promise.allSettled([fetchTeachers(), fetchStudents()])
  if (t.status === 'fulfilled') teachers.value = t.value || []
  if (s.status === 'fulfilled') students.value = s.value || []
  lookupsError.value = t.status === 'rejected' || s.status === 'rejected'
  lookupsLoading.value = false
}

onMounted(async () => {
  try {
    const saved = localStorage.getItem('saha-schedule-view')
    if (saved === 'month' || saved === 'week') view.value = saved
  } catch { /* private mode */ }
  sizeGrid()
  window.addEventListener('resize', sizeGrid)
  nowTimer = setInterval(() => { nowTick.value = DateTime.now().setZone('America/Chicago') }, 60_000)
  await loadLookups()
  await (view.value === 'week' ? loadWeek() : loadMonth())
})

// The week board's px-per-hour is measured from the DOM, which doesn't exist
// while the month grid is shown — re-measure when switching back.
watch(view, async (v) => {
  if (v === 'week') {
    await nextTick()
    sizeGrid()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', sizeGrid)
  if (nowTimer) clearInterval(nowTimer)
})

// If the admin session only resolves after mount, or the first load failed,
// (re)fetch the pickers as soon as we know we're admin.
watch(isAdmin, (v) => {
  if (v && (!teachers.value.length || !students.value.length)) loadLookups()
})

// ---------- New class form (admin) ----------
// Only approved students can be scheduled (the server enforces this too); pending
// registrations are hidden from the picker.
const approvedStudents = computed(() => students.value.filter((s) => s.approved))
const pendingStudentCount = computed(() => students.value.length - approvedStudents.value.length)

const showForm = ref(false)
const form = ref({ studentId: '', teacherId: '', days: [], startTime: '16:00', durationChoice: '60', customDuration: 45 })
const formError = ref('')
const formSubmitting = ref(false)

function openForm() {
  form.value = { studentId: '', teacherId: '', days: [], startTime: '16:00', durationChoice: '60', customDuration: 45 }
  formError.value = ''
  showForm.value = true
  focusModal()
  // Belt-and-suspenders: if the initial load missed (race/transient failure),
  // fetch the pickers now so the form is never stuck with empty dropdowns.
  if (!teachers.value.length || !students.value.length) loadLookups()
}
function closeForm() {
  showForm.value = false
  restoreFocus()
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
  if (form.value.days.length === 0) return (formError.value = 'Pick at least one day.')
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.value.startTime)) return (formError.value = 'Enter a valid start time.')
  if (!formDuration.value || formDuration.value < 5) return (formError.value = 'Enter a valid duration.')
  const fitsProblem = hoursProblem(form.value.days, form.value.startTime, formDuration.value)
  if (fitsProblem) return (formError.value = fitsProblem)
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
    closeForm()
    await reload()
  } catch (err) {
    formError.value = err?.message || 'Could not create the class.'
  } finally {
    formSubmitting.value = false
  }
}

// ---------- Manage a class (reschedule / cancel) ----------
// Clicking a scheduled block opens a manage modal: a menu of actions, plus two
// inline forms — move ONE occurrence, or (admin) re-pattern the whole series.
const cancelTarget = ref(null) // the clicked instance
const cancelBusy = ref(false)
const manageMode = ref('menu') // 'menu' | 'move-one' | 'move-series'
const manageError = ref('')
const moveOne = ref({ date: '', time: '' })
const moveSeries = ref({ days: [], time: '16:00', durationChoice: '60', customDuration: 45 })

function openCancel(inst) {
  if (inst.status === 'cancelled') return
  cancelTarget.value = inst
  manageMode.value = 'menu'
  manageError.value = ''
  focusModal()
}
function closeManage() {
  cancelTarget.value = null
  restoreFocus()
}
function startMoveOne() {
  const local = localOf(cancelTarget.value)
  moveOne.value = { date: local.toISODate(), time: local.toFormat('HH:mm') }
  manageError.value = ''
  manageMode.value = 'move-one'
}
function startMoveSeries() {
  const inst = cancelTarget.value
  const dur = String(inst.enrollmentDuration ?? inst.durationMinutes)
  moveSeries.value = {
    days: [...(inst.enrollmentDays || [])],
    time: inst.enrollmentTime || localOf(inst).toFormat('HH:mm'),
    durationChoice: ['30', '60', '120'].includes(dur) ? dur : 'custom',
    customDuration: Number(dur),
  }
  manageError.value = ''
  manageMode.value = 'move-series'
}
function toggleSeriesDay(d) {
  const i = moveSeries.value.days.indexOf(d)
  if (i === -1) moveSeries.value.days.push(d)
  else moveSeries.value.days.splice(i, 1)
}
const seriesDuration = computed(() =>
  moveSeries.value.durationChoice === 'custom' ? Number(moveSeries.value.customDuration) : Number(moveSeries.value.durationChoice),
)

async function doMoveOne() {
  manageError.value = ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(moveOne.value.date)) return (manageError.value = 'Pick a date.')
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(moveOne.value.time)) return (manageError.value = 'Enter a valid start time.')
  const movedWeekday = DateTime.fromISO(moveOne.value.date, { zone: tz.value }).weekday
  const oneProblem = hoursProblem([movedWeekday], moveOne.value.time, cancelTarget.value?.durationMinutes ?? 60)
  if (oneProblem) return (manageError.value = oneProblem)
  cancelBusy.value = true
  try {
    await rescheduleInstance(cancelTarget.value.id, { date: moveOne.value.date, startTimeLocal: moveOne.value.time })
    closeManage()
    await reload()
  } catch (err) {
    manageError.value = err?.message || 'Could not reschedule.'
  } finally {
    cancelBusy.value = false
  }
}
async function doMoveSeries() {
  manageError.value = ''
  if (moveSeries.value.days.length === 0) return (manageError.value = 'Pick at least one day.')
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(moveSeries.value.time)) return (manageError.value = 'Enter a valid start time.')
  const seriesProblem = hoursProblem(moveSeries.value.days, moveSeries.value.time, seriesDuration.value)
  if (seriesProblem) return (manageError.value = seriesProblem)
  if (!seriesDuration.value || seriesDuration.value < 5) return (manageError.value = 'Enter a valid duration.')
  cancelBusy.value = true
  try {
    await rescheduleEnrollment(cancelTarget.value.enrollmentId, {
      daysOfWeek: [...moveSeries.value.days].sort((a, b) => a - b),
      startTimeLocal: moveSeries.value.time,
      durationMinutes: seriesDuration.value,
    })
    closeManage()
    await reload()
  } catch (err) {
    manageError.value = err?.message || 'Could not reschedule the series.'
  } finally {
    cancelBusy.value = false
  }
}
async function doCancelInstance() {
  cancelBusy.value = true
  try {
    await cancelInstance(cancelTarget.value.id)
    closeManage()
    await reload()
  } catch (err) {
    manageError.value = err?.message || 'Could not cancel.'
  } finally {
    cancelBusy.value = false
  }
}
async function doCancelStudentSchedule() {
  cancelBusy.value = true
  try {
    await cancelStudentSchedule(cancelTarget.value.studentId)
    closeManage()
    await reload()
  } catch (err) {
    manageError.value = err?.message || 'Could not cancel the schedule.'
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
  focusModal()
}
function closeCloseDay() {
  showCloseDay.value = false
  restoreFocus()
}
async function doCloseDay() {
  closeDayError.value = ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(closeDayDate.value)) return (closeDayError.value = 'Pick a date.')
  closeDayBusy.value = true
  try {
    await cancelDay(closeDayDate.value)
    closeCloseDay()
    await reload()
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
  <div class="w-full px-3 md:px-6 py-5">
    <!-- Header + toolbar: one compact band so the board owns the viewport -->
    <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-4">
      <div class="min-w-[200px]">
        <h1 class="font-heading text-2xl md:text-[28px] font-extrabold text-navy-900 tracking-tight leading-none">Schedule</h1>
        <p class="font-body text-[13px] text-navy-500 mt-1.5">
          {{ isAdmin ? 'Master calendar — all teachers.' : 'Your weekly calendar.' }}
          <span class="text-navy-400">Times in {{ tz.replace('America/', '').replace('_', ' ') }} (Central).</span>
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <!-- segmented week nav -->
        <div class="flex items-stretch rounded-xl border border-navy-200 bg-white shadow-sm overflow-hidden">
          <button type="button" @click="prevPeriod" :aria-label="view === 'week' ? 'Previous week' : 'Previous month'" class="w-9 h-9 flex items-center justify-center text-navy-500 hover:bg-navy-50 hover:text-navy-800 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-academic-600 focus:outline-none">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button type="button" @click="goToday" class="px-3.5 h-9 border-x border-navy-100 font-body text-xs font-bold text-navy-700 hover:bg-navy-50 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-academic-600 focus:outline-none">Today</button>
          <button type="button" @click="nextPeriod" :aria-label="view === 'week' ? 'Next week' : 'Next month'" class="w-9 h-9 flex items-center justify-center text-navy-500 hover:bg-navy-50 hover:text-navy-800 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-academic-600 focus:outline-none">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <p class="font-heading text-base md:text-lg font-bold text-navy-800 tabular-nums whitespace-nowrap px-0.5">{{ rangeLabel }}</p>
        <!-- Week / Month toggle -->
        <div class="flex items-stretch rounded-xl border border-navy-200 bg-white shadow-sm overflow-hidden" role="group" aria-label="Calendar view">
          <button
            type="button"
            @click="setView('week')"
            :aria-pressed="view === 'week'"
            class="px-3.5 h-9 font-body text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-academic-600 focus:outline-none"
            :class="view === 'week' ? 'bg-[#001B3D] text-white' : 'text-navy-600 hover:bg-navy-50'"
          >
            Week
          </button>
          <button
            type="button"
            @click="setView('month')"
            :aria-pressed="view === 'month'"
            class="px-3.5 h-9 border-l border-navy-100 font-body text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-academic-600 focus:outline-none"
            :class="view === 'month' ? 'bg-[#001B3D] text-white' : 'text-navy-600 hover:bg-navy-50'"
          >
            Month
          </button>
        </div>
        <span v-if="loading" class="font-body text-xs text-navy-400">Loading…</span>

        <template v-if="isAdmin">
          <span class="hidden md:block w-px h-6 bg-navy-100 mx-0.5" aria-hidden="true"></span>
          <select
            v-model="teacherFilter"
            @change="reload"
            aria-label="Filter by teacher"
            class="h-9 px-3 rounded-xl border border-navy-200 bg-white font-body text-sm text-navy-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-academic-600"
          >
            <option value="">All teachers</option>
            <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
          <button
            type="button"
            @click="openCloseDay"
            class="h-9 px-3.5 rounded-xl border border-navy-200 bg-white text-navy-700 hover:bg-navy-50 font-body text-sm font-semibold shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-600 focus:outline-none"
          >
            Close a day
          </button>
          <button
            type="button"
            @click="openForm"
            class="h-9 px-4 rounded-xl bg-[#001B3D] text-white hover:bg-navy-800 font-body text-sm font-bold shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-600 focus:outline-none"
          >
            + New class
          </button>
        </template>
      </div>
    </div>

    <div v-if="error" role="alert" class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-body">{{ error }}</div>

    <!-- Week board: time gutter + five floating day cards. `isolate` contains
         the gutter/now-line z-indexes so they never paint over the app chrome
         (mobile top bar); tabindex makes the horizontal scroller keyboard-
         reachable so clipped days can be scrolled into view without a mouse. -->
    <div class="relative">
      <div
        v-if="view === 'week'"
        ref="gridShellRef"
        tabindex="0"
        role="region"
        aria-label="Weekly schedule board (scrolls sideways)"
        class="relative isolate z-0 overflow-x-auto pb-1 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-600 focus:outline-none"
      >
      <div class="flex gap-2 md:gap-2.5 min-w-[1180px]">
        <!-- time gutter — sticky so the hour scale stays put while the board
             scrolls horizontally on narrow screens -->
        <div class="w-11 md:w-12 shrink-0 relative sticky left-0 z-30 bg-slate-50" :style="{ height: HEADER_PX + gridHeight + 'px' }">
          <div
            v-for="h in hourRowsInclusive"
            :key="h"
            class="absolute right-1 font-body text-[11px] font-semibold leading-none text-navy-500 tabular-nums whitespace-nowrap"
            :style="hourLabelStyle(h)"
          >
            {{ fmtHour(h) }}
          </div>
        </div>

        <!-- day cards -->
        <!-- keyed by weekday SLOT (not date) so switching weeks updates the five
             existing cards in place instead of tearing them down and rebuilding —
             that rebuild was a visible stutter on week navigation -->
        <section
          v-for="(day, i) in weekDays"
          :key="i"
          class="flex-1 min-w-[150px] rounded-2xl bg-white flex flex-col overflow-hidden"
          :class="isToday(day)
            ? 'border-2 border-academic-400/60 shadow-[0_12px_32px_-12px_rgba(2,27,61,0.35)]'
            : 'border border-navy-100 shadow-[0_2px_12px_-6px_rgba(2,27,61,0.18)]'"
        >
          <!-- card header: weekday tag + serif date numeral -->
          <header
            class="shrink-0 px-3 flex items-center justify-between border-b"
            :style="{ height: HEADER_PX + 'px' }"
            :class="isToday(day) ? 'bg-academic-50/80 border-academic-100' : 'bg-navy-50/40 border-navy-100'"
          >
            <div>
              <p class="font-body text-[10px] tracking-[0.22em] uppercase font-bold" :class="isToday(day) ? 'text-academic-600' : 'text-navy-500'">
                {{ WEEKDAY_LABELS[i] }}
              </p>
              <p class="font-heading text-[22px] font-extrabold leading-none mt-0.5 text-navy-900 tabular-nums">
                {{ day.toFormat('d') }}<span class="font-body text-[11px] font-semibold text-navy-400 ml-1">{{ day.toFormat('MMM') }}</span>
              </p>
              <p class="font-body text-[9px] font-semibold text-navy-400 mt-0.5 tabular-nums">{{ fmtWindow(i + 1) }}</p>
            </div>
            <span v-if="isToday(day)" class="px-2 py-1 rounded-full bg-academic-500 text-white font-body text-[9px] font-bold uppercase tracking-[0.14em]">Today</span>
            <span v-else-if="instancesByDay[i + 1].length" class="min-w-[22px] h-[22px] px-1.5 rounded-full bg-navy-100/80 text-navy-600 font-body text-[10px] font-bold flex items-center justify-center tabular-nums" :title="`${instancesByDay[i + 1].length} class${instancesByDay[i + 1].length === 1 ? '' : 'es'}`">
              {{ instancesByDay[i + 1].length }}
            </span>
          </header>

          <!-- card body: hour bands, lines, now-line, class blocks. overflow-
               hidden so no block can ever paint over the card header. -->
          <div class="relative overflow-hidden" :style="{ height: gridHeight + 'px' }">
            <!-- hours this day is closed (weekends shut at 6 PM, weekdays
                 open at 3 PM) — shaded so the open window reads at a glance -->
            <div
              v-for="band in closedBands(i + 1)"
              :key="'closed-' + band.top"
              class="absolute left-0 right-0 bg-navy-100/50 pointer-events-none flex items-center justify-center"
              :style="{ top: band.top + 'px', height: band.height + 'px' }"
            >
              <span v-if="band.height >= 30" class="font-body text-[9px] font-bold uppercase tracking-[0.16em] text-navy-400">Closed</span>
            </div>
            <!-- alternate-hour zebra bands -->
            <div
              v-for="h in zebraHours"
              :key="'band-' + h"
              class="absolute left-0 right-0 bg-academic-50/40 pointer-events-none"
              :style="{ top: (h - START_HOUR) * pxPerHour + 'px', height: pxPerHour + 'px' }"
            ></div>
            <!-- half-hour gridlines -->
            <div
              v-for="h in hourRows"
              :key="'half-' + h"
              class="absolute left-0 right-0 border-t border-dashed border-navy-100/70 pointer-events-none"
              :style="{ top: (h - START_HOUR) * pxPerHour + pxPerHour / 2 + 'px' }"
            ></div>
            <!-- hour gridlines -->
            <div
              v-for="h in interiorHours"
              :key="'hour-' + h"
              class="absolute left-0 right-0 border-t border-navy-100 pointer-events-none"
              :style="{ top: (h - START_HOUR) * pxPerHour + 'px' }"
            ></div>
            <!-- live now-line (today, during teaching hours) -->
            <div
              v-if="isToday(day) && nowOffset !== null"
              class="absolute left-0 right-0 z-20 pointer-events-none"
              :style="{ top: nowOffset + 'px' }"
            >
              <div class="h-[2px] bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]"></div>
              <div class="absolute -top-[3px] left-0 w-2 h-2 rounded-full bg-red-400"></div>
            </div>

            <!-- class blocks -->
            <button
              v-for="inst in instancesByDay[i + 1]"
              :key="inst.id"
              type="button"
              @click="openCancel(inst)"
              :disabled="!canCancel(inst)"
              class="absolute z-10 rounded-[10px] px-2 py-1.5 text-left overflow-hidden transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-academic-600 focus:outline-none"
              :class="inst.status === 'cancelled' ? 'cursor-default' : 'shadow-sm hover:shadow-lg hover:-translate-y-px cursor-pointer'"
              :style="{
                top: inst._top + 'px',
                height: inst._height + 'px',
                left: `calc(${(inst._col / inst._cols) * 100}% + 3px)`,
                width: `calc(${(1 / inst._cols) * 100}% - 6px)`,
                backgroundColor: inst.status === 'cancelled' ? '#EDEFF3' : inst.teacherColor + '22',
                borderLeft: `3px solid ${inst.status === 'cancelled' ? '#9CA3AF' : inst.teacherColor}`,
              }"
              :title="`${inst.studentName} · ${inst.teacherName} · ${inst._timeRange}${inst.status === 'cancelled' ? ' · cancelled' : ''}`"
            >
              <p
                class="font-body text-[12.5px] font-bold leading-tight truncate"
                :class="inst.status === 'cancelled' ? 'text-navy-600 line-through' : 'text-navy-900'"
              >
                {{ inst.studentName }}
              </p>
              <p class="font-body text-[10.5px] leading-tight tabular-nums truncate" :class="inst.status === 'cancelled' ? 'text-navy-500' : 'text-navy-600'">
                {{ inst._timeRange }}
              </p>
              <p v-if="isAdmin" class="font-body text-[10px] leading-tight truncate text-navy-500">
                {{ inst.teacherName }}
              </p>
              <p v-if="inst.status === 'cancelled'" class="font-body text-[9px] uppercase tracking-wide text-red-600 font-bold">Cancelled</p>
            </button>
          </div>
        </section>
      </div>
      </div>

      <!-- Month grid: Mon–Fri weeks of the month, classes as compact chips -->
      <div
        v-else
        tabindex="0"
        role="region"
        aria-label="Monthly schedule grid (scrolls sideways)"
        class="relative isolate z-0 overflow-x-auto pb-1 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-600 focus:outline-none"
      >
        <div class="min-w-[980px]">
          <div class="grid grid-cols-7 gap-2 md:gap-2.5 mb-2">
            <p
              v-for="lbl in WEEKDAY_LABELS"
              :key="lbl"
              class="text-center font-body text-[10px] tracking-[0.22em] uppercase font-bold text-navy-500"
            >
              {{ lbl }}
            </p>
          </div>
          <div v-for="(week, wi) in monthWeeks" :key="wi" class="grid grid-cols-7 gap-2 md:gap-2.5 mb-2 md:mb-2.5">
            <section
              v-for="day in week"
              :key="day.toISODate()"
              class="rounded-xl bg-white min-h-[104px] md:min-h-[120px] p-2 flex flex-col gap-1.5"
              :class="[
                isToday(day)
                  ? 'border-2 border-academic-400/60 shadow-[0_8px_20px_-10px_rgba(2,27,61,0.3)]'
                  : 'border border-navy-100 shadow-[0_1px_6px_-3px_rgba(2,27,61,0.15)]',
                day.month !== monthStart.month ? 'bg-navy-50/40' : '',
              ]"
            >
              <div class="flex items-center justify-between">
                <p
                  class="font-heading text-sm font-extrabold tabular-nums leading-none"
                  :class="isToday(day) ? 'text-academic-600' : day.month === monthStart.month ? 'text-navy-800' : 'text-navy-300'"
                >
                  {{ day.toFormat('d') }}
                </p>
                <span v-if="isToday(day)" class="px-1.5 py-0.5 rounded-full bg-academic-500 text-white font-body text-[8px] font-bold uppercase tracking-[0.12em]">Today</span>
              </div>
              <div class="flex flex-col gap-1">
                <button
                  v-for="inst in (instancesByDate[day.toISODate()] || []).slice(0, MONTH_MAX_CHIPS)"
                  :key="inst.id"
                  type="button"
                  @click="openCancel(inst)"
                  :disabled="!canCancel(inst)"
                  class="w-full text-left rounded-md px-1.5 py-1 overflow-hidden transition-shadow focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-academic-600 focus:outline-none"
                  :class="inst.status === 'cancelled' ? 'cursor-default' : 'hover:shadow-md cursor-pointer'"
                  :style="{
                    backgroundColor: inst.status === 'cancelled' ? '#EDEFF3' : inst.teacherColor + '22',
                    borderLeft: `3px solid ${inst.status === 'cancelled' ? '#9CA3AF' : inst.teacherColor}`,
                  }"
                  :title="`${inst.studentName} · ${inst.teacherName} · ${inst._timeRange}${inst.status === 'cancelled' ? ' · cancelled' : ''}`"
                >
                  <p class="font-body text-[10.5px] leading-tight truncate" :class="inst.status === 'cancelled' ? 'text-navy-500 line-through' : 'text-navy-800'">
                    <span class="font-bold tabular-nums">{{ inst._chipTime }}</span> {{ inst.studentName }}
                  </p>
                </button>
                <button
                  v-if="(instancesByDate[day.toISODate()] || []).length > MONTH_MAX_CHIPS"
                  type="button"
                  @click="gotoWeekOf(day)"
                  class="w-full text-left rounded-md px-1.5 py-0.5 font-body text-[10px] font-bold text-academic-700 hover:bg-academic-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-academic-600 focus:outline-none"
                >
                  +{{ (instancesByDate[day.toISODate()] || []).length - MONTH_MAX_CHIPS }} more
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      <!-- empty note — a sibling of the scrollers (not a child), so it stays
           centred in the visible viewport instead of scrolling away with the
           board, and never shows during loading or after a fetch error -->
      <div v-if="hasLoaded && !loading && !error && instances.length === 0" class="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
        <p class="px-4 py-2 rounded-full bg-white/95 border border-navy-100 shadow-sm font-body text-sm text-navy-600">
          {{ view === 'week' ? 'No classes this week — every slot is open.' : 'No classes this month.' }}
        </p>
      </div>
    </div>

    <!-- legend + hint -->
    <div class="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 px-1">
      <template v-if="isAdmin && teachers.length">
        <div v-for="t in teachers" :key="t.id" class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: t.color }"></span>
          <span class="font-body text-xs text-navy-500">{{ t.name }}</span>
        </div>
      </template>
      <p class="ml-auto font-body text-[11px] text-navy-500">Click a class to reschedule or cancel it.</p>
    </div>

    <!-- New class modal (admin) -->
    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="New recurring class" @keydown.esc="closeForm">
      <div class="absolute inset-0 bg-black/40" @click="closeForm"></div>
      <div ref="modalPanel" tabindex="-1" @keydown="trapTab" class="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 md:p-7 max-h-[90vh] overflow-y-auto focus:outline-none">
        <h2 class="font-heading text-xl font-bold text-navy-900 mb-1">New recurring class</h2>
        <p class="font-body text-xs text-navy-500 mb-5">Generates classes for 6 months. Same start time on every selected weekday.</p>
        <div v-if="formError" role="alert" class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-body">{{ formError }}</div>
        <div v-if="lookupsLoading" class="mb-4 p-3 rounded-lg bg-navy-50 border border-navy-100 text-navy-500 text-sm font-body">Loading students and teachers…</div>
        <div v-else-if="!students.length || !teachers.length" role="alert" class="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm font-body flex items-center justify-between gap-3">
          <span>Couldn't load the {{ !students.length && !teachers.length ? 'student and teacher lists' : !students.length ? 'student list' : 'teacher list' }}.</span>
          <button type="button" @click="loadLookups" class="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700">Retry</button>
        </div>
        <form @submit.prevent="submitForm" class="space-y-4">
          <div>
            <label for="sf-student" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Student</label>
            <select id="sf-student" v-model="form.studentId" class="w-full px-3 py-2.5 rounded-lg border border-navy-200 bg-white font-body text-sm text-navy-800 focus:outline-none focus:ring-2 focus:ring-academic-600">
              <option value="" disabled>Select a student…</option>
              <option v-for="s in approvedStudents" :key="s.id" :value="s.id">{{ s.studentName }}</option>
            </select>
            <p v-if="pendingStudentCount > 0" class="font-body text-[11px] text-navy-400 mt-1">
              {{ pendingStudentCount }} student{{ pendingStudentCount === 1 ? '' : 's' }} awaiting approval {{ pendingStudentCount === 1 ? 'is' : 'are' }} hidden — approve them in the Students tab first.
            </p>
          </div>
          <div>
            <label for="sf-teacher" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Teacher</label>
            <select id="sf-teacher" v-model="form.teacherId" class="w-full px-3 py-2.5 rounded-lg border border-navy-200 bg-white font-body text-sm text-navy-800 focus:outline-none focus:ring-2 focus:ring-academic-600">
              <option value="" disabled>Select a teacher…</option>
              <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div>
            <label class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5" id="sf-days-label">Days</label>
            <div class="flex flex-wrap gap-2" role="group" aria-labelledby="sf-days-label">
              <button
                v-for="(label, i) in WEEKDAY_LABELS"
                :key="i"
                type="button"
                @click="toggleDay(i + 1)"
                :aria-pressed="form.days.includes(i + 1)"
                class="px-3.5 py-2 rounded-lg border font-body text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-600 focus:outline-none"
                :class="form.days.includes(i + 1) ? 'bg-academic-600 border-academic-600 text-white' : 'bg-white border-navy-200 text-navy-600 hover:bg-navy-50'"
              >
                {{ label }}
              </button>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="sf-time" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Start (Central)</label>
              <input id="sf-time" v-model="form.startTime" type="time" class="w-full px-3 py-2.5 rounded-lg border border-navy-200 bg-white font-body text-sm text-navy-800 focus:outline-none focus:ring-2 focus:ring-academic-600" />
            </div>
            <div>
              <label class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5" id="sf-duration-label">Duration</label>
              <div class="flex gap-1.5" role="radiogroup" aria-labelledby="sf-duration-label">
                <button v-for="d in ['30', '60', '120']" :key="d" type="button" @click="form.durationChoice = d"
                  role="radio" :aria-checked="form.durationChoice === d"
                  class="flex-1 px-2 py-2.5 rounded-lg border font-body text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-600 focus:outline-none"
                  :class="form.durationChoice === d ? 'bg-academic-600 border-academic-600 text-white' : 'bg-white border-navy-200 text-navy-600 hover:bg-navy-50'">{{ d }}m</button>
                <button type="button" @click="form.durationChoice = 'custom'"
                  role="radio" :aria-checked="form.durationChoice === 'custom'"
                  class="flex-1 px-2 py-2.5 rounded-lg border font-body text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-600 focus:outline-none"
                  :class="form.durationChoice === 'custom' ? 'bg-academic-600 border-academic-600 text-white' : 'bg-white border-navy-200 text-navy-600 hover:bg-navy-50'">Custom</button>
              </div>
              <input v-if="form.durationChoice === 'custom'" v-model.number="form.customDuration" type="number" min="5" max="600" aria-label="Custom duration in minutes" class="mt-2 w-full px-3 py-2 rounded-lg border border-navy-200 bg-white font-body text-sm text-navy-800 focus:outline-none focus:ring-2 focus:ring-academic-600" placeholder="minutes" />
            </div>
          </div>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="closeForm" class="flex-1 px-4 py-2.5 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 font-body text-sm font-semibold">Cancel</button>
            <button type="submit" :disabled="formSubmitting" class="flex-1 px-4 py-2.5 rounded-lg bg-[#001B3D] text-white hover:bg-navy-800 font-body text-sm font-bold disabled:opacity-60">{{ formSubmitting ? 'Creating…' : 'Create class' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Manage class modal: reschedule one / reschedule series / cancel -->
    <div v-if="cancelTarget" class="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="Manage class" @keydown.esc="closeManage">
      <div class="absolute inset-0 bg-black/40" @click="closeManage"></div>
      <div ref="modalPanel" tabindex="-1" @keydown="trapTab" class="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 focus:outline-none">
        <h2 class="font-heading text-lg font-bold text-navy-900 mb-1">
          {{ manageMode === 'move-one' ? 'Reschedule this class' : manageMode === 'move-series' ? 'Reschedule whole series' : 'Manage class' }}
        </h2>
        <p class="font-body text-sm text-navy-600 mb-4">
          <span class="font-semibold">{{ cancelTarget.studentName }}</span> · {{ localOf(cancelTarget).toFormat('EEE, MMM d') }} · {{ cancelTarget._timeRange }}<span v-if="isAdmin"> · {{ cancelTarget.teacherName }}</span>
        </p>

        <div v-if="manageError" role="alert" class="mb-4 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-body">{{ manageError }}</div>

        <!-- Menu -->
        <div v-if="manageMode === 'menu'" class="space-y-2">
          <button type="button" @click="startMoveOne" class="w-full px-4 py-2.5 rounded-lg bg-[#001B3D] text-white hover:bg-navy-800 font-body text-sm font-bold">Reschedule this class</button>
          <button
            v-if="isAdmin && cancelTarget.enrollmentStatus === 'active'"
            type="button"
            @click="startMoveSeries"
            class="w-full px-4 py-2.5 rounded-lg border border-navy-200 text-navy-800 hover:bg-navy-50 font-body text-sm font-bold"
          >
            Reschedule the whole series
          </button>
          <button type="button" @click="doCancelInstance" :disabled="cancelBusy" class="w-full px-4 py-2.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 font-body text-sm font-bold disabled:opacity-60">Cancel just this class</button>
          <button v-if="isAdmin" type="button" @click="doCancelStudentSchedule" :disabled="cancelBusy" class="w-full px-4 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-body text-sm font-bold disabled:opacity-60">Cancel {{ cancelTarget.studentName }}'s entire schedule</button>
          <button type="button" @click="closeManage" class="w-full px-4 py-2.5 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 font-body text-sm font-semibold">Keep it</button>
        </div>

        <!-- Move ONE occurrence -->
        <form v-else-if="manageMode === 'move-one'" @submit.prevent="doMoveOne" class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="mv-date" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">New date</label>
              <input id="mv-date" v-model="moveOne.date" type="date" class="w-full px-3 py-2.5 rounded-lg border border-navy-200 bg-white font-body text-sm text-navy-800 focus:outline-none focus:ring-2 focus:ring-academic-600" />
            </div>
            <div>
              <label for="mv-time" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Start (Central)</label>
              <input id="mv-time" v-model="moveOne.time" type="time" class="w-full px-3 py-2.5 rounded-lg border border-navy-200 bg-white font-body text-sm text-navy-800 focus:outline-none focus:ring-2 focus:ring-academic-600" />
            </div>
          </div>
          <p class="font-body text-[11px] text-navy-500">Monday–Friday only. Length stays {{ cancelTarget.durationMinutes }} minutes; the family is emailed the change.</p>
          <div class="flex gap-3">
            <button type="button" @click="manageMode = 'menu'; manageError = ''" class="flex-1 px-4 py-2.5 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 font-body text-sm font-semibold">Back</button>
            <button type="submit" :disabled="cancelBusy" class="flex-1 px-4 py-2.5 rounded-lg bg-[#001B3D] text-white hover:bg-navy-800 font-body text-sm font-bold disabled:opacity-60">{{ cancelBusy ? 'Moving…' : 'Move class' }}</button>
          </div>
        </form>

        <!-- Move the WHOLE series (admin) -->
        <form v-else @submit.prevent="doMoveSeries" class="space-y-4">
          <div>
            <label class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5" id="mv-days-label">New weekdays</label>
            <div class="flex flex-wrap gap-2" role="group" aria-labelledby="mv-days-label">
              <button
                v-for="(label, i) in WEEKDAY_LABELS"
                :key="i"
                type="button"
                @click="toggleSeriesDay(i + 1)"
                :aria-pressed="moveSeries.days.includes(i + 1)"
                class="px-3 py-2 rounded-lg border font-body text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-600 focus:outline-none"
                :class="moveSeries.days.includes(i + 1) ? 'bg-academic-600 border-academic-600 text-white' : 'bg-white border-navy-200 text-navy-600 hover:bg-navy-50'"
              >
                {{ label }}
              </button>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="mv-series-time" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Start (Central)</label>
              <input id="mv-series-time" v-model="moveSeries.time" type="time" class="w-full px-3 py-2.5 rounded-lg border border-navy-200 bg-white font-body text-sm text-navy-800 focus:outline-none focus:ring-2 focus:ring-academic-600" />
            </div>
            <div>
              <label class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5" id="mv-duration-label">Duration</label>
              <div class="flex gap-1" role="radiogroup" aria-labelledby="mv-duration-label">
                <button v-for="d in ['30', '60', '120']" :key="d" type="button" @click="moveSeries.durationChoice = d"
                  role="radio" :aria-checked="moveSeries.durationChoice === d"
                  class="flex-1 px-1.5 py-2.5 rounded-lg border font-body text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-600 focus:outline-none"
                  :class="moveSeries.durationChoice === d ? 'bg-academic-600 border-academic-600 text-white' : 'bg-white border-navy-200 text-navy-600 hover:bg-navy-50'">{{ d }}m</button>
                <button type="button" @click="moveSeries.durationChoice = 'custom'"
                  role="radio" :aria-checked="moveSeries.durationChoice === 'custom'"
                  class="flex-1 px-1.5 py-2.5 rounded-lg border font-body text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-600 focus:outline-none"
                  :class="moveSeries.durationChoice === 'custom' ? 'bg-academic-600 border-academic-600 text-white' : 'bg-white border-navy-200 text-navy-600 hover:bg-navy-50'">…</button>
              </div>
              <input v-if="moveSeries.durationChoice === 'custom'" v-model.number="moveSeries.customDuration" type="number" min="5" max="600" aria-label="Custom duration in minutes" class="mt-2 w-full px-3 py-2 rounded-lg border border-navy-200 bg-white font-body text-sm text-navy-800 focus:outline-none focus:ring-2 focus:ring-academic-600" placeholder="minutes" />
            </div>
          </div>
          <p class="font-body text-[11px] text-navy-500">Applies from today onward through the series' end date. Past classes stay as they were; the family is emailed the new schedule.</p>
          <div class="flex gap-3">
            <button type="button" @click="manageMode = 'menu'; manageError = ''" class="flex-1 px-4 py-2.5 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 font-body text-sm font-semibold">Back</button>
            <button type="submit" :disabled="cancelBusy" class="flex-1 px-4 py-2.5 rounded-lg bg-[#001B3D] text-white hover:bg-navy-800 font-body text-sm font-bold disabled:opacity-60">{{ cancelBusy ? 'Rescheduling…' : 'Reschedule series' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Close-a-day modal (admin) -->
    <div v-if="showCloseDay" class="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="Close a day" @keydown.esc="closeCloseDay">
      <div class="absolute inset-0 bg-black/40" @click="closeCloseDay"></div>
      <div ref="modalPanel" tabindex="-1" @keydown="trapTab" class="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 focus:outline-none">
        <h2 class="font-heading text-lg font-bold text-navy-900 mb-1">Close a day</h2>
        <p class="font-body text-xs text-navy-500 mb-4">Cancels every class on this date, across all teachers (emergency closure).</p>
        <div v-if="closeDayError" role="alert" class="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-body">{{ closeDayError }}</div>
        <label for="cd-date" class="block font-body text-xs font-semibold text-navy-700 uppercase tracking-wider mb-1.5">Date to close</label>
        <input id="cd-date" v-model="closeDayDate" type="date" class="w-full px-3 py-2.5 rounded-lg border border-navy-200 bg-white font-body text-sm text-navy-800 mb-4 focus:outline-none focus:ring-2 focus:ring-academic-600" />
        <div class="flex gap-3">
          <button type="button" @click="closeCloseDay" class="flex-1 px-4 py-2.5 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50 font-body text-sm font-semibold">Cancel</button>
          <button type="button" @click="doCloseDay" :disabled="closeDayBusy" class="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-body text-sm font-bold disabled:opacity-60">{{ closeDayBusy ? 'Closing…' : 'Close day' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
