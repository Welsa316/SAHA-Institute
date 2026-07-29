// Regenerates public/sitemap.xml from the canonical list of public routes.
// Runs at the START of `npm run build` so the sitemap can never drift from the
// prerendered pages again (it previously sat stale for weeks and was missing
// /workshops entirely). lastmod is the build date — every listed page is
// prerendered per build, so that is honest.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ORIGIN = 'https://sahainstituteforlearning.com'

// Keep in lockstep with vite.config.js includedRoutes and the server's
// PRERENDERED_ROUTES set.
const ROUTES = ['/', '/about', '/summer-camp', '/workshops', '/enroll', '/contact', '/register', '/careers']

const today = new Date().toISOString().slice(0, 10)
const urls = ROUTES.map(
  (r) => `  <url>
    <loc>${ORIGIN}${r === '/' ? '/' : r}</loc>
    <lastmod>${today}</lastmod>
  </url>`,
).join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sitemap.xml')
writeFileSync(out, xml)
console.log(`[sitemap] wrote ${ROUTES.length} urls (lastmod ${today})`)
