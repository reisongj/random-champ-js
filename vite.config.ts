import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // For Railway: use base path "/" (root)
  // For GitHub Pages: use "/random-champ-js/" (or your repo name)
  // Set VITE_BASE_PATH environment variable during build if needed
  base: process.env.VITE_BASE_PATH || '/',
})

