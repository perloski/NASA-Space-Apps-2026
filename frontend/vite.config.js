import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Backend local. Se puede cambiar con la variable de entorno API_PROXY_TARGET.
const API_TARGET = process.env.API_PROXY_TARGET ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  // /api -> backend, tanto en desarrollo (npm run dev) como al probar el build de
  // producción en local (npm run build && npm run preview). Así no hay problemas de CORS.
  server: { proxy: { '/api': API_TARGET } },
  preview: { proxy: { '/api': API_TARGET } },
  build: { chunkSizeWarningLimit: 3500 }, // el chunk del visor trae aladin-lite (~3 MB con su WASM)
})
