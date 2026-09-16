import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed at the root of michaeljohnwatters.github.io, so base = '/'.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
