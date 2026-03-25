import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const base = process.env.VITE_BASE_PATH ?? '/';
const staticRoutes = ['encontro-europeu'];

function copyIndexTo404() {
  return {
    name: 'copy-index-to-404',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      copyFileSync(resolve(distDir, 'index.html'), resolve(distDir, '404.html'));

      for (const route of staticRoutes) {
        const routeDir = resolve(distDir, route);
        mkdirSync(routeDir, { recursive: true });
        copyFileSync(resolve(distDir, 'index.html'), resolve(routeDir, 'index.html'));
      }
    }
  };
}

export default defineConfig({
  base,
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (id.includes('firebase')) {
            return 'firebase-vendor';
          }

          if (id.includes('react') || id.includes('@tanstack/react-query') || id.includes('scheduler')) {
            return 'react-vendor';
          }
        }
      }
    }
  },
  plugins: [
    react(),
    copyIndexTo404()
  ]
});
