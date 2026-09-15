import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
// Configured so the app can be embedded in an <iframe> on another site:
// - relative base so it works from any host path
// - dev server headers relaxed for cross-origin framing
export default defineConfig({
    plugins: [react()],
    base: './',
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        headers: {
            'X-Frame-Options': 'ALLOWALL',
        },
    },
    build: {
        target: 'es2020',
        sourcemap: true,
    },
});
