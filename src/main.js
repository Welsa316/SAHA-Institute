import { ViteSSG } from 'vite-ssg'
import App from './App.vue'
import { routes, scrollBehavior, setupRouter } from './router'
import './style.css'

// vite-ssg prerenders the public routes to static HTML at build time (see
// ssgOptions.includedRoutes in vite.config.js) so non-JS crawlers (Googlebot's
// first pass, GPTBot/ClaudeBot/PerplexityBot) and link unfurlers see real
// content + the correct per-route head. Auth/admin routes stay client-only.
export const createApp = ViteSSG(
  App,
  { routes, scrollBehavior },
  ({ router, isClient }) => {
    setupRouter(router, isClient)
  },
)
