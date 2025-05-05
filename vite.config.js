import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/admin': 'http://localhost:8080',
      '/auth': {
        target: 'http://localhost:8080', // 백엔드 주소
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react()],
})
