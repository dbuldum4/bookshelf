import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub project Pages serves at /bookshelf/. Override with VITE_BASE=/ for root hosting.
const base = process.env.VITE_BASE || '/bookshelf/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
})
