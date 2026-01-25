
import { SDKService } from '../api/services/SDKService.js';
import { embeddingService } from '../api/services/EmbeddingService.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('🔍 Starting RAG Debugger...');

    // 1. Check SDK
    await SDKService.initialize();

    // Give it a moment to connect via WebSocket/HTTP
    await new Promise(r => setTimeout(r, 2000));

    const sdk = SDKService.getSDK();
    if (!sdk) {
        console.error('❌ SDK not available. Is the Desktop App running?');
        // Try initializing?
        // SDKService usually initializes on import or server start. 
        // We might need to manually trigger init if this is a standalone script.
        // Looking at SDKService, it seems to be a singleton.
        // Let's assume we need to wait/check.
    } else {
        console.log('✅ SDK Instance found.');
    }

    // 2. getUser
    // We need a userId to test. Let's fetch the first user.
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error || !users || users.length === 0) {
        console.error('❌ Could not fetch users:', error);
        return;
    }

    // In local dev, we might not have admin access easily via anon key. 
    // We'll try to just query ALL vectors without userId filter first to see what's there.
    const userId = users[0].id;
    console.log(`👤 Testing with User ID: ${userId}`);

    // 3. Test Embedding Generation
    const query = "AI news";
    console.log(`\n🧪 Generating embedding for: "${query}"...`);

    // Mock settings
    const settings = {
        llm_provider: 'realtimexai',
        embedding_provider: 'realtimexai',
        embedding_model: 'text-embedding-3-small'
    };

    const vector = await embeddingService.generateEmbedding(query, settings as any);

    if (!vector) {
        console.error('❌ Failed to generate embedding.');
        return;
    }
    console.log(`✅ Embedding generated (Length: ${vector.length})`);

    // 4. Query Vectors (Low Threshold)
    console.log('\n🔎 Querying Vectors (Threshold: 0.5)...');

    try {
        // Direct SDK call to bypass service filters for debugging
        const results = await sdk.llm.vectors.query(vector, {
            topK: 10,
            workspaceId: 'alchemy-signals'
        });

        console.log(`✅ Raw Results Found: ${results.results.length}`);

        results.results.forEach((r: any, i: number) => {
            console.log(`\n[${i + 1}] Score: ${r.score}`);
            console.log(`    ID: ${r.id}`);
            console.log(`    Title: ${r.metadata?.title}`);
            console.log(`    UserID: ${r.metadata?.userId}`);

            // Check match
            if (r.metadata?.userId === userId) {
                console.log('    MATCHES USER ✅');
            } else {
                console.log('    USER MISMATCH ❌');
            }
        });

    } catch (e: any) {
        console.error('❌ Vector Query Failed:', e.message);
    }
}

main();
