import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  const backendUrl = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:3001'
  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': { target: backendUrl, changeOrigin: true }
      }
    }
  }
})
