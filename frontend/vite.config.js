var _a;
import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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
        copyIndexTo404()
    ]
});
