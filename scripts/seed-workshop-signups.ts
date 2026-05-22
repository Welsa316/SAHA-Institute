// One-off seed script that imports the workshop signups Mrs. Anila collected
// via her WhatsApp group poll (May 2026) into the workshop_signups table.
// Hits the public POST endpoint authenticated as admin — that path skips the
// public rate limiter and doesn't fire admin-notification emails.
//
// Run against local dev:
//   DATABASE_URL=postgresql://... \
//   ADMIN_EMAIL=sahaforlearning1675@gmail.com \
//   ADMIN_PASSWORD=localtest123 \
//   tsx scripts/seed-workshop-signups.ts
//
// Run against Railway:
//   API_BASE=https://sahainstituteforlearning.com \
//   ADMIN_EMAIL=sahaforlearning1675@gmail.com \
//   ADMIN_PASSWORD=<production password> \
//   tsx scripts/seed-workshop-signups.ts
//
// Idempotency note: this script does NOT check for existing rows. Running it
// twice will create duplicate signups. Run once per environment.

interface Signup {
  parentName: string
  studentName: string | null
  workshops: string[]
}

// Compiled from the 11 WhatsApp poll screenshots. Names with "(X's Mom)" go in
// the studentName field per Anila's note: the registrant is the parent, the
// kid is the student.
//
// KNOWN GAP: Sewing Workshop showed 6 voters but the screenshot only listed
// 5 (the WhatsApp UI collapsed the last one behind "See all (1 more)").
// Re-export that poll from WhatsApp to capture name #6 if needed.

const SIGNUPS: Signup[] = [
  {
    parentName: 'Khadija',
    studentName: null,
    workshops: [
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
    ],
  },
  {
    parentName: 'Shona',
    studentName: null,
    workshops: [
      'Henna Design Workshop',
      'Flower Bouquet and Arrangements',
      'Jewellery, Tasbeeh and Bedazzling Workshop',
      'Baking Workshop',
      'Arabic Calligraphy Workshop',
      'Basic Auto Workshop',
      'LEGO Workshop',
      'Ice cream, Mocktail, and Snowball Workshop',
      'Clay Molding Workshop',
      'Tie Dye Workshop',
    ],
  },
  {
    parentName: 'Humaira',
    studentName: null,
    workshops: [
      'Flower Bouquet and Arrangements',
      'Baking Workshop',
      'Arabic Calligraphy Workshop',
      'Sewing Workshop',
      'LEGO Workshop',
    ],
  },
  {
    parentName: 'Aya',
    studentName: 'Fayrose',
    workshops: [
      'Flower Bouquet and Arrangements',
      'Arabic Calligraphy Workshop',
      'Sewing Workshop',
      'LEGO Workshop',
    ],
  },
  {
    parentName: 'Sara',
    studentName: 'Mahrukh',
    workshops: ['Baking Workshop'],
  },
  {
    parentName: 'Sameera Yasmeen',
    studentName: null,
    workshops: [
      'Baking Workshop',
      'Arabic Calligraphy Workshop',
      'Sewing Workshop',
      'Clay Molding Workshop',
    ],
  },
  {
    parentName: 'Ms. Lena Hussein',
    studentName: null,
    workshops: ['Sewing Workshop', 'Basic Auto Workshop'],
  },
]

const API_BASE = process.env.API_BASE ?? 'http://localhost:3000'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in the environment.')
  process.exit(1)
}

async function login(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Login failed (${res.status}): ${body}`)
  }
  // Pull the saha_session cookie out of Set-Cookie. fetch in Node exposes
  // this via getSetCookie() which returns the raw set-cookie strings.
  const cookies = (res.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
  const session = cookies.find((c) => c.startsWith('saha_session='))
  if (!session) throw new Error('Login response had no saha_session cookie')
  // We only want the name=value pair, not the attributes.
  return session.split(';')[0]!
}

async function postSignup(cookie: string, signup: Signup): Promise<void> {
  const res = await fetch(`${API_BASE}/api/workshop-signups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify(signup),
  })
  const body = await res.text()
  if (!res.ok) {
    throw new Error(`POST failed (${res.status}) for ${signup.parentName}: ${body}`)
  }
  const labelStudent = signup.studentName ? ` (student: ${signup.studentName})` : ''
  console.log(
    `  ✓ ${signup.parentName}${labelStudent} — ${signup.workshops.length} workshop${signup.workshops.length === 1 ? '' : 's'}`,
  )
}

async function main(): Promise<void> {
  console.log(`Target: ${API_BASE}`)
  console.log(`Seeding ${SIGNUPS.length} signups…`)
  console.log()

  const cookie = await login()
  console.log('Logged in as admin.')
  console.log()

  for (const signup of SIGNUPS) {
    try {
      await postSignup(cookie, signup)
    } catch (err) {
      console.error(`  ✗ ${signup.parentName}: ${(err as Error).message}`)
    }
  }

  console.log()
  console.log('Done. Note: the Sewing Workshop poll had a 6th voter hidden')
  console.log('behind "See all (1 more)" in WhatsApp — re-export that poll')
  console.log('and add the missing name manually from /admin/workshop-signups.')
}

void main()
