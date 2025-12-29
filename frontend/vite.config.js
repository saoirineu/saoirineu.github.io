var _a;
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
var base = (_a = process.env.VITE_BASE_PATH) !== null && _a !== void 0 ? _a : '/';
export default defineConfig({
    base: base,
    plugins: [
        react(),
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
                globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
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
