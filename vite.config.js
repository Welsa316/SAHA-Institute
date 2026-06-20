import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// In dev, Vite runs the frontend on :5173 and the Express API server runs on :3000.
// Proxying /api keeps the frontend code the same in dev and prod — fetch('/api/...')
// just works either way.

export default defineConfig({
  plugins: [vue()],
  // vite-ssg: prerender the public, indexable routes to static HTML. Flat output
  // (/about.html) avoids colliding with the public/summer-camp/ image directory.
  ssgOptions: {
    script: 'async',
    formatting: 'minify',
    dirStyle: 'flat',
    crittersOptions: false, // skip critical-CSS inlining (avoids the optional beasties/critters dep)
    includedRoutes(paths) {
      const prerender = new Set(['/', '/about', '/summer-camp', '/enroll', '/contact', '/register'])
      return paths.filter((p) => prerender.has(p))
    },
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
