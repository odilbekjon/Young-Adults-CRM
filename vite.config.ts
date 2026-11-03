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
  build: {
    rollupOptions: {
      output: {
        // Pages are split off by Router.tsx (React.lazy); this keeps the libraries
        // out of the app's own files. A deploy then only replaces the small app
        // chunks - the vendor chunks keep their file names, so returning users
        // take them from their browser cache - and the first visit downloads
        // them in parallel. recharts (and the d3 modules behind it) is the
        // biggest library and only a few pages draw charts, so it is a chunk of
        // its own that the other pages never fetch.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules[\\/](recharts|victory-vendor|d3-[^\\/]+|internmap|decimal\.js-light|es-toolkit|eventemitter3|tiny-invariant)[\\/]/.test(id)) return 'vendor-charts'
          if (/node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) return 'vendor-react'
          if (/node_modules[\\/](@mui|@emotion|@popperjs|stylis|react-transition-group)[\\/]/.test(id)) return 'vendor-mui'
          if (/node_modules[\\/](@reduxjs|react-redux|redux|immer|reselect|i18next|react-i18next|i18next-browser-languagedetector)[\\/]/.test(id)) return 'vendor-state'
          return undefined
        },
      },
    },
  },
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
