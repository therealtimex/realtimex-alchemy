import { copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

const src = join(ROOT_DIR, 'CHANGELOG.md');
const dest = join(ROOT_DIR, 'public', 'CHANGELOG.md');

try {
    if (existsSync(src)) {
        copyFileSync(src, dest);
        console.log('✅ CHANGELOG.md copied to public/');
    } else {
        console.error('❌ CHANGELOG.md not found');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ Failed to copy CHANGELOG.md:', error.message);
    process.exit(1);
}
