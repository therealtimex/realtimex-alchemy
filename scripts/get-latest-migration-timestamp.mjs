#!/usr/bin/env node

/**
 * Extract the latest migration timestamp from supabase/migrations/
 *
 * Migration files follow the pattern: YYYYMMDDHHMMSS_description.sql
 */

import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations');

try {
    const files = readdirSync(MIGRATIONS_DIR);
    const timestamps = files
        .filter((file) => file.endsWith('.sql'))
        .map((file) => {
            const match = file.match(/^(\d{14})_/);
            return match ? match[1] : null;
        })
        .filter(Boolean)
        .sort()
        .reverse();

    if (timestamps.length === 0) {
        console.error('No migration files found');
        process.exit(1);
    }

    process.stdout.write(timestamps[0]);
} catch (error) {
    process.exit(1);
}
