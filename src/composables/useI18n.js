import { ref, computed, watch } from 'vue'
import en from '../i18n/en.js'
import ur from '../i18n/ur.js'

const translations = { en, ur }
const locale = ref(localStorage.getItem('saha-locale') || 'en')

export function useI18n() {
  const isRTL = computed(() => locale.value === 'ur')

  function t(key) {
    const keys = key.split('.')
    let value = translations[locale.value]
    for (const k of keys) {
      value = value?.[k]
    }
    return value || key
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
