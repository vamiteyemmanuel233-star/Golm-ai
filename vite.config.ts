import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The /api proxy forwards assistant requests to the optional local AI server
// (server/index.mjs). The browser never talks to the AI provider directly,
// so the API key never reaches browser code.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: false,
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: false,
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'server/**/*.test.mjs'],
  },
});
