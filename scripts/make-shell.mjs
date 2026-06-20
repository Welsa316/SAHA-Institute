import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// vite-ssg prerenders the homepage into dist/index.html (with full markup). The
// non-prerendered routes (auth/admin) need a CLEAN shell to hydrate from —
// serving the homepage there would flash homepage content and cause a hydration
// mismatch. Derive dist/app-shell.html by emptying #app while keeping the exact
// (hashed) script/style tags from the real build.
const dist = join(process.cwd(), 'dist')
const html = readFileSync(join(dist, 'index.html'), 'utf8')
// The module script sits in <head> (async), so #app runs straight to </body>.
const shell = html.replace(/<div id="app"[^>]*>[\s\S]*<\/body>/, '<div id="app"></div></body>')

if (shell === html) {
  console.error('[make-shell] WARNING: #app content not found — shell not emptied')
  process.exit(1)
}
writeFileSync(join(dist, 'app-shell.html'), shell)
console.log('[make-shell] wrote dist/app-shell.html')
