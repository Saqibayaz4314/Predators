import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const apiTarget = process.env.API_PROXY_TARGET || 'http://127.0.0.1:3001';
const proxy = { '/api': apiTarget, '/health': apiTarget, '/ready': apiTarget };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173, strictPort: true,
    proxy,
  },
  preview: { proxy },
});
