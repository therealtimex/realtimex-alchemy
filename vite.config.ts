import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { execSync } from 'child_process';
import pkg from './package.json';

// Get latest migration timestamp for UI versioning
let latestMigrationTimestamp = '20240101000000';
try {
    latestMigrationTimestamp = execSync('node scripts/get-latest-migration-timestamp.mjs').toString().trim();
} catch (e: any) {
    console.warn('Failed to get migration timestamp:', e.message);
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    define: {
        'import.meta.env.VITE_LATEST_MIGRATION_TIMESTAMP': JSON.stringify(latestMigrationTimestamp),
        'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
    },
    css: {
        postcss: {
            plugins: [
                tailwindcss,
                autoprefixer,
            ],
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/events': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                sse: true,
            },
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    }
});
