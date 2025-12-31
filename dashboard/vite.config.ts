import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable Fast Refresh for better HMR experience
      fastRefresh: true,
    }),
  ],
  server: {
    // Enable HMR (Hot Module Replacement)
    hmr: true,
    // Watch for file changes
    watch: {
      usePolling: false,
    },
    // Port for dev server
    port: 5173,
    // Open browser automatically
    open: true,
  },
})

