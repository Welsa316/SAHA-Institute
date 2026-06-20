import { ref, computed } from 'vue'
import en from '../i18n/en.js'
import ur from '../i18n/ur.js'

const translations = { en, ur }

// Default to 'en' for the first render so the server-prerendered HTML and the
// client's first (hydration) render match. The visitor's saved locale is applied
// after mount via initLocale() — see App.vue. (SSR-safe: no localStorage/document
// access at module load.)
const locale = ref('en')
let initialized = false

function applyHtmlAttrs(val) {
  if (typeof document === 'undefined') return
  document.documentElement.dir = val === 'ur' ? 'rtl' : 'ltr'
  document.documentElement.lang = val
}

function setLocale(val) {
  locale.value = val
  applyHtmlAttrs(val)
  if (typeof localStorage !== 'undefined') localStorage.setItem('saha-locale', val)
}

// Client-only: read the stored locale once after hydration and apply it.
function initLocale() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('saha-locale') : null
  setLocale(stored === 'ur' || stored === 'en' ? stored : 'en')
}

export function useI18n() {
  const isRTL = computed(() => locale.value === 'ur')

  // Optional `params` interpolates {placeholder} tokens, e.g.
  // t('portal.greeting', { name: 'Aisha' }) against "Welcome, {name}".
  // No params -> original passthrough behaviour, so existing callers are unaffected.
  function t(key, params) {
    const keys = key.split('.')
    let value = translations[locale.value]
    for (const k of keys) {
      value = value?.[k]
    }
    if (typeof value !== 'string') return value || key
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match, name) =>
        Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
      )
    }
    return value
  }

  function toggleLocale() {
    setLocale(locale.value === 'en' ? 'ur' : 'en')
  }

  return { locale, isRTL, t, toggleLocale, setLocale, initLocale }
}
