// Shared phone-number formatting. Everything user-facing shows US numbers as
// "(504) 373-9778" regardless of how they were typed or stored.

// Live input formatter: feed it the raw input value on every keystroke and
// write the result back. Strips non-digits, caps at 10 digits, and formats
// progressively so the user sees "(50", "(504) 3", "(504) 373-9778" as they
// type. A leading US country code "1" on an 11-digit paste is dropped.
export function formatPhoneInput(raw) {
  let digits = String(raw ?? '').replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1)
  digits = digits.slice(0, 10)
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

// Display formatter for stored values, which may be legacy free-form entries
// ("504.555.0303", "5045550303", "+1 504 555 0303"). If we can extract a
// clean 10-digit US number, format it; otherwise show the original as-is
// rather than mangling an international or partial number.
export function formatPhoneDisplay(value) {
  if (!value) return '—'
  let digits = String(value).replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1)
  if (digits.length !== 10) return String(value)
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}
