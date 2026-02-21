import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '5231'),
    proxy: {
      '/v1': {
        target: process.env.VITE_API_URL || 'http://localhost:5103',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '5231'),
    allowedHosts: [
      'taldium-webapp.onrender.com',
      'localhost',
      '.onrender.com',
    ],
  },
})

