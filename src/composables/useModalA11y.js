import { watch, onUnmounted, nextTick } from 'vue'

// Accessibility plumbing shared by every modal/dialog: scroll lock, focus the
// first control on open, restore focus to the trigger on close, ESC to close,
// and a Tab focus-trap so keyboard users can't tab into the page behind.
//
// A shared stack makes nesting correct — when a ConfirmDialog opens over the
// student detail modal, ESC and the Tab trap apply ONLY to the topmost dialog,
// and body scroll stays locked until the last one closes.
//
// Usage:
//   const panel = ref(null)
//   useModalA11y(() => isOpen.value, panel, () => { isOpen.value = false })
// and put `ref="panel"` on the dialog panel element.

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const stack = []
let listening = false

function focusables(panel) {
  if (!panel) return []
  return [...panel.querySelectorAll(FOCUSABLE)].filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  )
}

function onKeydown(e) {
  const top = stack[stack.length - 1]
  if (!top) return
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    top.close()
    return
  }
  if (e.key !== 'Tab') return
  const panel = top.panelRef.value
  const items = focusables(panel)
  if (items.length === 0) {
    // Nothing focusable — keep focus from escaping the dialog.
    e.preventDefault()
    return
  }
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement
  const inPanel = panel?.contains(active)
  if (e.shiftKey && (active === first || !inPanel)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && (active === last || !inPanel)) {
    e.preventDefault()
    first.focus()
  }
}

function ensureListener() {
  if (!listening) {
    document.addEventListener('keydown', onKeydown, true)
    listening = true
  }
}

export function useModalA11y(getOpen, panelRef, close) {
  let previousActive = null
  let entry = null

  function release() {
    if (!entry) return
    const i = stack.indexOf(entry)
    if (i !== -1) stack.splice(i, 1)
    entry = null
    if (stack.length === 0) document.body.style.overflow = ''
  }

  watch(getOpen, async (open) => {
    if (open && !entry) {
      previousActive = document.activeElement
      if (stack.length === 0) document.body.style.overflow = 'hidden'
      entry = { panelRef, close }
      stack.push(entry)
      ensureListener()
      await nextTick()
      const items = focusables(panelRef.value)
      ;(items[0] ?? panelRef.value)?.focus?.()
    } else if (!open && entry) {
      release()
      previousActive?.focus?.()
      previousActive = null
    }
  })

  onUnmounted(release)
}
