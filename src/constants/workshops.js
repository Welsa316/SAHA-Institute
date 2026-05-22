// Single source of truth for the summer workshop catalog. Imported by both
// the public signup form (parents pick from these) and the admin signups
// view (filter dropdown). Stored as plain strings — the same strings land
// in workshop_signups.workshops (Postgres text[]) verbatim, so renaming a
// workshop here also "renames" historical rows for display purposes via
// the form constants, but doesn't rewrite already-stored values.
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
