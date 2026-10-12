import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const projectEnv = { ...loadEnv(mode, '..', 'BACKEND_'), ...loadEnv(mode, '..', 'FRONTEND_') }
  const backendPort = process.env.BACKEND_PORT || projectEnv.BACKEND_PORT || '3001'
  const backendUrl = process.env.VITE_BACKEND_URL || `http://127.0.0.1:${backendPort}`
  return {
    plugins: [react()],
    server: {
      port: Number(process.env.FRONTEND_PORT || projectEnv.FRONTEND_PORT || 3000),
      proxy: {
        '/api': { target: backendUrl, changeOrigin: true }
      }
    }
  }
})
