import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    // 🔴 Fixes SockJS "global is not defined" error in Vite
    global: 'window',
  },
  server: {
    host: true, // Listens on all local IP addresses (0.0.0.0)
    port: 5173,
    allowedHosts: ['.nip.io'], // Allows any subdomain under nip.io
  },
})