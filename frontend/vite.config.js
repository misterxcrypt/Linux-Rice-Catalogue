import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/linux-rice-catalogue/', // <-- your repo name with trailing slash
})

