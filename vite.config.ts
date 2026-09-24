import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
})
