import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // For Railway: use base path "/" (root)
  // For GitHub Pages: use "/random-champ-js/" (or your repo name)
  // Set VITE_BASE_PATH environment variable during build if needed
  base: process.env.VITE_BASE_PATH || '/',

  // Ensure vite dev/preview binds to all interfaces and picks up the PORT
  // This helps hosting platforms (like Render) that expect services to bind 0.0.0.0
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 5173,
  },
})

