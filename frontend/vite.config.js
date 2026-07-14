import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy API calls to the backend so the browser sees everything as
    // same-origin in dev — otherwise the session cookie (SameSite=Lax)
    // never gets sent back on cross-origin fetch/EventSource requests.
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
