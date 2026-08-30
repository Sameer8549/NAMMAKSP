import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'frontend/assets/app',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: 'ui-src/dashboard.tsx',
      output: {
        entryFileNames: 'dashboard.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'dashboard.[ext]'
      }
    }
  }
});
