import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    'window.VITE_BUILD_DATE': JSON.stringify(process.env.VITE_BUILD_DATE ?? 'local'),
    'window.VITE_BUILD_SHA': JSON.stringify(process.env.VITE_BUILD_SHA ?? 'local'),
  },
  root: './src',
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.BACKEND_PORT || 3000}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'ES2020',
    outDir: '../dist',
  },
});
