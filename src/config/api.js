// src/config/api.js

// Vite reads .env.development during 'npm run dev'
// and .env.production during 'npm run build' / Vercel deployments!
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
export const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws';