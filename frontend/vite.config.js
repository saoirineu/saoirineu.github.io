var _a;
import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
var base = (_a = process.env.VITE_BASE_PATH) !== null && _a !== void 0 ? _a : '/';
var staticRoutes = ['encontro-europeu'];
function copyIndexTo404() {
    return {
        name: 'copy-index-to-404',
        closeBundle: function () {
            var distDir = resolve(__dirname, 'dist');
            copyFileSync(resolve(distDir, 'index.html'), resolve(distDir, '404.html'));
            for (var _i = 0, staticRoutes_1 = staticRoutes; _i < staticRoutes_1.length; _i++) {
                var route = staticRoutes_1[_i];
                var routeDir = resolve(distDir, route);
                mkdirSync(routeDir, { recursive: true });
                copyFileSync(resolve(distDir, 'index.html'), resolve(routeDir, 'index.html'));
            }
        }
    };
}
export default defineConfig({
    base: base,
    build: {
        rollupOptions: {
            output: {
                manualChunks: function (id) {
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
                name: 'São Irineu',
                short_name: 'São Irineu',
                description: 'PWA para navegação das ontologias e dados do Santo Daime.',
                theme_color: '#3f84c2',
                background_color: '#f7f4ea',
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
                        urlPattern: function (_a) {
                            var request = _a.request;
                            return request.destination === 'document';
                        },
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'html-cache'
                        }
                    },
                    {
                        urlPattern: function (_a) {
                            var request = _a.request;
                            return request.destination === 'style' || request.destination === 'script';
                        },
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
