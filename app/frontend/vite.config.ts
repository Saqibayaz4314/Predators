import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173, strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:3001', '/health': 'http://127.0.0.1:3001', '/ready': 'http://127.0.0.1:3001' },
  },
  preview: { proxy: { '/api': 'http://127.0.0.1:3001', '/health': 'http://127.0.0.1:3001', '/ready': 'http://127.0.0.1:3001' } },
});
