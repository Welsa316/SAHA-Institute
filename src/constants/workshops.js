// Single source of truth for the summer workshop catalog. Imported by both
// the public signup form (parents pick from these) and the admin signups
// view (filter dropdown + colored pills). Stored as plain strings — the
// same strings land in workshop_signups.workshops (Postgres text[]) verbatim.
//
// Order matches the list Mrs. Anila provided. We render in this order in
// both the form grid and the admin filter dropdown so it stays scannable.

export const WORKSHOPS = [
  'Henna Design Workshop',
  'Flower Bouquet and Arrangements',
  'Jewellery, Tasbeeh and Bedazzling Workshop',
  'Baking Workshop',
  'Arabic Calligraphy Workshop',
  'Sewing Workshop',
  'Basic Auto Workshop',
  'LEGO Workshop',
  'Ice cream, Mocktail, and Snowball Workshop',
  'Clay Molding Workshop',
  'Tie Dye Workshop',
]

// Per-workshop color tokens for the admin pills. Each workshop gets a hue
// chosen to evoke the subject (henna = rose, calligraphy = emerald for the
// Islamic association, LEGO = red brick, etc). Two complete class strings
// per workshop because Tailwind's JIT scans source text — dynamic
// `bg-${color}-50` wouldn't get picked up by the purge pass.
//
// Pill state encodes BOTH which workshop (color) AND whether it's paid:
//   unpaid → light tinted bg + colored text + outlined border (low weight)
//   paid   → solid colored bg + white text + checkmark next to label
//
// Unknown workshop names (e.g. legacy rows) fall back to WORKSHOP_PILL_FALLBACK.

export const WORKSHOP_PILL_CLASSES = {
  'Henna Design Workshop': {
    unpaid: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    paid: 'bg-rose-500 text-white border-rose-600 hover:bg-rose-600',
  },
  'Flower Bouquet and Arrangements': {
    unpaid: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100',
    paid: 'bg-pink-500 text-white border-pink-600 hover:bg-pink-600',
  },
  'Jewellery, Tasbeeh and Bedazzling Workshop': {
    unpaid: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-100',
    paid: 'bg-fuchsia-500 text-white border-fuchsia-600 hover:bg-fuchsia-600',
  },
  'Baking Workshop': {
    unpaid: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    paid: 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600',
  },
  'Arabic Calligraphy Workshop': {
    unpaid: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    paid: 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600',
  },
  'Sewing Workshop': {
    unpaid: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    paid: 'bg-indigo-500 text-white border-indigo-600 hover:bg-indigo-600',
  },
  'Basic Auto Workshop': {
    unpaid: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200',
    paid: 'bg-slate-600 text-white border-slate-700 hover:bg-slate-700',
  },
  'LEGO Workshop': {
    unpaid: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    paid: 'bg-red-500 text-white border-red-600 hover:bg-red-600',
  },
  'Ice cream, Mocktail, and Snowball Workshop': {
    unpaid: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100',
    paid: 'bg-cyan-500 text-white border-cyan-600 hover:bg-cyan-600',
  },
  'Clay Molding Workshop': {
    unpaid: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    paid: 'bg-orange-500 text-white border-orange-600 hover:bg-orange-600',
  },
  'Tie Dye Workshop': {
    unpaid: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
    paid: 'bg-violet-500 text-white border-violet-600 hover:bg-violet-600',
  },
}

export const WORKSHOP_PILL_FALLBACK = {
  unpaid: 'bg-navy-50 text-navy-700 border-navy-200 hover:bg-navy-100',
  paid: 'bg-navy-700 text-white border-navy-800 hover:bg-navy-800',
}

export function workshopPillClasses(name, paid) {
  const variant = WORKSHOP_PILL_CLASSES[name] ?? WORKSHOP_PILL_FALLBACK
  return paid ? variant.paid : variant.unpaid
}
