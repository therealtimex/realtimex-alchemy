#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);

// Default port
let port = '3012';
const portIndex = args.indexOf('--port');
if (portIndex !== -1 && args[portIndex + 1]) {
    port = args[portIndex + 1];
}

console.log('🚀 RealTimeX Alchemy starting...');
console.log(`📡 Port: ${port}`);
console.log('');

// Path to compiled server
const serverPath = join(__dirname, '..', 'dist', 'api', 'index.js');
const distPath = join(__dirname, '..', 'dist');

const server = spawn(process.execPath, [serverPath, ...args], {
    stdio: 'inherit',
    env: {
        ...process.env,
        PORT: port,
        ELECTRON_STATIC_PATH: distPath
    },
});

server.on('error', (error) => {
    console.error('❌ Failed to start RealTimeX Alchemy:', error.message);
    process.exit(1);
});

server.on('close', (code) => {
    if (code !== 0) {
        console.log(`\n⚠️  RealTimeX Alchemy stopped with code ${code}`);
    }
    process.exit(code || 0);
});

process.on('SIGINT', () => {
    console.log('\n\n⏹️  Shutting down RealTimeX Alchemy...');
    server.kill('SIGINT');
});

process.on('SIGTERM', () => {
    server.kill('SIGTERM');
});
