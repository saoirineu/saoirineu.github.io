import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

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
    copyIndexTo404(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
      manifest: {
        name: 'Saoirineu',
        short_name: 'Saoirineu',
        description: 'PWA para navegação das ontologias e dados do Santo Daime.',
        theme_color: '#0f172a',
        background_color: '#f8fafc',
        display: 'standalone',
        scope: base,
        start_url: base,
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,pdf}'],
        navigateFallbackDenylist: [/\.[^/]+$/],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache'
            }
          },
          {
            urlPattern: ({ request }) => request.destination === 'style' || request.destination === 'script',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'asset-cache'
            }
          }
        ]
      }
    })
  ]
});
