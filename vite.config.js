import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// In dev, Vite runs the frontend on :5173 and the Express API server runs on :3000.
// Proxying /api keeps the frontend code the same in dev and prod — fetch('/api/...')
// just works either way.

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
