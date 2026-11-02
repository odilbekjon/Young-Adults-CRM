import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Production bundles must not ship debug output: console.log/info/debug calls
  // are removed at build time (console.error/warn stay, they are real
  // diagnostics). `pure` only drops a call whose arguments have no side
  // effects, so no behaviour changes. Dev (`vite`) keeps every log.
  esbuild: command === 'build' ? { pure: ['console.log', 'console.info', 'console.debug'], drop: ['debugger'] } : {},
  server: {
    // Not currently exercised by the app itself — baseApi.tsx's
    // fetchBaseQuery hits the backend's absolute URL directly rather than
    // a relative /api/... path, which bypasses this dev proxy entirely.
    // Kept in sync with the real backend host regardless, in case anything
    // relative ever routes through it.
    proxy: {
      '/api': {
        target: 'https://api.youngadults-crm.uz',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}))
