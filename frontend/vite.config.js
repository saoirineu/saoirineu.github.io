var _a;
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
var base = (_a = process.env.VITE_BASE_PATH) !== null && _a !== void 0 ? _a : '/';
function copyIndexTo404() {
    return {
        name: 'copy-index-to-404',
        closeBundle: function () {
            var distDir = resolve(__dirname, 'dist');
            copyFileSync(resolve(distDir, 'index.html'), resolve(distDir, '404.html'));
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
            includeAssets: ['icon.svg'],
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
                        type: 'image/svg+xml'
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
