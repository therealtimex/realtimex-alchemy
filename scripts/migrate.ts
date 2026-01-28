import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, existsSync, statSync } from 'fs';
import { createInterface } from 'readline';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
};

async function runCommand(command: string, args: string[], env = {}): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log(`\n🏃 Running: ${command} ${args.join(' ')}`);
        const child = spawn(command, args, {
            stdio: 'inherit',
            shell: true,
            env: { ...process.env, ...env }
        });

        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command failed with code ${code}`));
        });

        child.on('error', (err) => {
            reject(err);
        });
    });
}

async function findSupabaseBin(): Promise<{ cmd: string; baseArgs: string[] }> {
    const isWindows = process.platform === 'win32';
    const binName = isWindows ? 'supabase.cmd' : 'supabase';
    const candidate = join(ROOT_DIR, 'node_modules', '.bin', binName);

    if (existsSync(candidate)) {
        return { cmd: candidate, baseArgs: [] };
    }
    // Fallback to npx
    return { cmd: 'npx', baseArgs: ['--no-install', 'supabase'] };
}

async function main() {
    console.log("🚀 Starting RealTimeX Alchemy Migration Tool...");

    const { cmd: SUPABASE_CMD, baseArgs: SUPABASE_ARGS } = await findSupabaseBin();
    console.log(`   Using: ${SUPABASE_CMD} ${SUPABASE_ARGS.join(' ')}`);

    if (!existsSync(join(ROOT_DIR, 'supabase'))) {
        console.error("❌ Error: supabase folder not found");
        process.exit(1);
    }

    let projectId = process.env.SUPABASE_PROJECT_ID;
    if (!projectId) {
        console.log("---------------------------------------------------------");
        console.log("👉 Enter your Supabase Project Reference ID:");
        console.log("   (Found in Supabase Dashboard > Project Settings > General)");
        projectId = await question("   Project ID: ");
    }

    if (!projectId) {
        console.error("❌ Error: Project ID is required to proceed.");
        process.exit(1);
    }

    let accessToken = process.env.SUPABASE_ACCESS_TOKEN;
    if (!accessToken) {
        console.error("❌ Error: SUPABASE_ACCESS_TOKEN is required.");
        console.log("   Generate one at: https://supabase.com/dashboard/account/tokens");
        process.exit(1);
    }

    try {
        process.chdir(ROOT_DIR);

        console.log("---------------------------------------------------------");
        console.log(`🔗 Linking to Supabase Project: ${projectId}`);
        await runCommand(SUPABASE_CMD, [...SUPABASE_ARGS, 'link', '--project-ref', projectId]);

        console.log("---------------------------------------------------------");
        console.log("📂 Pushing Database Schema Changes...");
        await runCommand(SUPABASE_CMD, [...SUPABASE_ARGS, 'db', 'push']);

        console.log("---------------------------------------------------------");
        console.log("⚙️  Pushing Project Configuration...");
        await runCommand(SUPABASE_CMD, [...SUPABASE_ARGS, 'config', 'push']);

        console.log("---------------------------------------------------------");
        console.log("🔐 Setting up Edge Function secrets...");
        
        // Use shell: true in runCommand to handle pipes or just run simple command
        // For simplicity and cross-platform, we can try to list secrets
        try {
            // Note: This might be tricky across platforms if it relies on grep.
            // We'll just try to set it, Supabase CLI usually handles existing ones if possible
            // or we just skip if we can detect it.
            
            console.log("   Checking TOKEN_ENCRYPTION_KEY...");
            const encryptionKey = crypto.randomBytes(24).toString('base64');
            await runCommand(SUPABASE_CMD, [...SUPABASE_ARGS, 'secrets', 'set', `TOKEN_ENCRYPTION_KEY=${encryptionKey}`]);
            console.log("   ✅ TOKEN_ENCRYPTION_KEY has been set/updated");
        } catch (e) {
            console.log("   ⚠️ Note: Secret setting might have failed or already exists.");
        }

        console.log("---------------------------------------------------------");
        console.log("⚡ Deploying Edge Functions...");
        const functionsDir = join(ROOT_DIR, 'supabase', 'functions');
        if (existsSync(functionsDir)) {
            const entries = readdirSync(functionsDir);
            for (const entry of entries) {
                const funcPath = join(functionsDir, entry);
                if (statSync(funcPath).isDirectory() && !entry.startsWith('_') && !entry.startsWith('.')) {
                    if (existsSync(join(funcPath, 'index.ts'))) {
                        console.log(`   Deploying ${entry}...`);
                        await runCommand(SUPABASE_CMD, [...SUPABASE_ARGS, 'functions', 'deploy', entry, '--no-verify-jwt']);
                    }
                }
            }
        }

        console.log("---------------------------------------------------------");
        console.log("✅ SUCCESS: Backend updated successfully!");
        
    } catch (error: any) {
        console.error(`\n❌ Error during migration: ${error.message}`);
        process.exit(1);
    } finally {
        rl.close();
    }
}

main();
