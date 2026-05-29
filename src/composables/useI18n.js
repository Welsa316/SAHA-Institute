import { ref, computed, watch } from 'vue'
import en from '../i18n/en.js'
import ur from '../i18n/ur.js'

const translations = { en, ur }
const locale = ref(localStorage.getItem('saha-locale') || 'en')

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
    locale.value = locale.value === 'en' ? 'ur' : 'en'
  }

  watch(locale, (val) => {
    localStorage.setItem('saha-locale', val)
    document.documentElement.dir = val === 'ur' ? 'rtl' : 'ltr'
    document.documentElement.lang = val
  }, { immediate: true })

  return { locale, isRTL, t, toggleLocale }
}
