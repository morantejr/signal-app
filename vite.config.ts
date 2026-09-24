import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Served from https://morantejr.github.io/signal-app/ on GitHub Pages, so the
// production build needs a sub-path base. Local dev stays at "/".
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/signal-app/' : '/',
})
