import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        // Proxy /api requests to Wrangler dev server when running locally
        // If Wrangler is not running, fetch will fail and fall back to localStorage mock
        // In production (Cloudflare Pages), /api routes are handled by Pages Functions automatically
      },
    },
  },
})
