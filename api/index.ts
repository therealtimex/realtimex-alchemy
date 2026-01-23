import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { MinerService } from './services/MinerService.js';
import { AlchemistService } from './services/AlchemistService.js';
import { LibrarianService } from './services/LibrarianService.js';
import { CONFIG } from './config/index.js';
import { EventService } from './services/EventService.js';
import { SupabaseService } from './services/SupabaseService.js';
import { BrowserPathDetector } from './utils/BrowserPathDetector.js';
import { ProcessingEventService } from './services/ProcessingEventService.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const miner = new MinerService();
const alchemist = new AlchemistService();
const librarian = new LibrarianService();
const events = EventService.getInstance();

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'active', platform: process.platform });
});

// SSE Events
app.get('/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    events.addClient(res);

    req.on('close', () => events.removeClient(res));
});

// Helper: Get authenticated Supabase client from request
function getAuthenticatedSupabase(req: Request): any {
    const supabaseUrl = req.headers['x-supabase-url'] as string;
    const supabaseKey = req.headers['x-supabase-key'] as string;
    const authHeader = req.headers['authorization'] as string;
    const accessToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (supabaseUrl && supabaseKey) {
        return SupabaseService.createClient(supabaseUrl, supabaseKey, accessToken);
    }

    if (SupabaseService.isConfigured() && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
        return SupabaseService.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, accessToken);
    }

    throw new Error('Supabase Configuration Missing. Please configure in Settings or add .env file.');
}

// Get signals
app.get('/api/signals', async (req: Request, res: Response) => {
    try {
        const supabase = getAuthenticatedSupabase(req);
        const signals = await librarian.getSignals(supabase);
        res.json(signals);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Test/Debug endpoints
// Trigger Mining (Multi-source)
app.post('/api/mine', async (req: Request, res: Response) => {
    const processingEvents = ProcessingEventService.getInstance();
    const syncStartTime = Date.now();

    try {
        const supabase = getAuthenticatedSupabase(req);

        // Get settings for the active user using the TOKEN-SCOPED client
        // The token determines which user's data we can see.
        const { data: settings } = await supabase
            .from('alchemy_settings')
            .select('*')
            //.eq('user_id', ...) // RLS handles this implicitly usually, but we pick the first row found
            .limit(1)
            .single();

        if (!settings) {
            throw new Error('Alchemy Engine settings not found. Please save settings in the UI first.');
        }

        const enabledSources = (settings.custom_browser_paths || []).filter((s: any) => s.enabled);

        // Emit: Sync Starting
        await processingEvents.log({
            eventType: 'info',
            agentState: 'Starting',
            message: 'Sync starting...',
            level: 'info',
            metadata: {
                is_start: true,
                sync_mode: settings.sync_mode || 'incremental',
                max_urls: settings.max_urls_per_sync || 50,
                browser_sources: enabledSources.length,
                browsers: enabledSources.map((s: any) => s.label).join(', ')
            },
            userId: settings.user_id
        }, supabase);

        console.log('[API] Settings loaded:', {
            id: settings.id,
            has_custom_paths: !!settings.custom_browser_paths,
            raw_paths: settings.custom_browser_paths,
            type: typeof settings.custom_browser_paths
        });

        // 1. Mine History (Extract)
        const history = await miner.mineHistory(settings, supabase);

        // 2. Analyze (Process in background with completion callback)
        if (history.length > 0) {
            alchemist.process(history, settings, supabase, settings.user_id, syncStartTime).catch(err => {
                console.error("Alchemist Error:", err);
                // Emit error completion event
                processingEvents.log({
                    eventType: 'error',
                    agentState: 'Failed',
                    message: `Sync failed: ${err.message}`,
                    level: 'error',
                    metadata: {
                        is_completion: true,
                        error: err.message
                    },
                    userId: settings.user_id
                }, supabase);
            });
        } else {
            // No URLs to process - emit completion immediately
            const duration = Date.now() - syncStartTime;
            await processingEvents.log({
                eventType: 'info',
                agentState: 'Completed',
                message: 'Sync completed - no new URLs found',
                level: 'info',
                durationMs: duration,
                metadata: {
                    is_completion: true,
                    total_urls: 0,
                    signals_found: 0,
                    skipped: 0,
                    errors: 0,
                    duration_seconds: Math.round(duration / 1000)
                },
                userId: settings.user_id
            }, supabase);
        }

        res.json({ success: true, history_count: history.length, queued: true });
    } catch (error: any) {
        console.error('Mining Logic Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Browser path detection
app.get('/api/browser-paths/detect', async (req: Request, res: Response) => {
    try {
        const detector = new BrowserPathDetector();
        const results = detector.detectAll();
        res.json(results);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Browser path validation
app.post('/api/browser-paths/validate', async (req: Request, res: Response) => {
    const { path: filePath } = req.body;

    if (!filePath) {
        return res.status(400).json({ error: 'Path is required' });
    }

    try {
        const detector = new BrowserPathDetector();
        const result = detector.validateSQLitePath(filePath);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/test/analyze', async (req: Request, res: Response) => {
    const { text } = req.body;
    try {
        // Fetch settings from database
        let settings: any = {
            llm_provider: 'realtimexai',
            llm_model: 'gpt-4o'
        };

        if (SupabaseService.isConfigured()) {
            const supabase = SupabaseService.getServiceRoleClient();
            const { data: userData } = await supabase.rpc('get_any_user_id');
            if (userData) {
                const { data: dbSettings } = await supabase
                    .from('alchemy_settings')
                    .select('*')
                    .eq('user_id', userData)
                    .single();

                if (dbSettings) {
                    settings = dbSettings;
                }
            }
        }

        const result = await alchemist.analyzeSignal(text, settings);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Test LLM Connection
app.post('/api/llm/test', async (req: Request, res: Response) => {
    const { llmProvider, llmModel } = req.body;
    try {
        const settings: any = {
            llm_provider: llmProvider || 'realtimexai',
            llm_model: llmModel || 'gpt-4o'
        };

        const result = await alchemist.testConnection(settings);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Unified Static Assets Serving
const staticPath = process.env.ELECTRON_STATIC_PATH || path.join(__dirname, '..', '..', 'dist');

if (fs.existsSync(staticPath)) {
    console.log(`[Alchemy] Serving UI from ${staticPath}`);
    app.use(express.static(staticPath));

    // Client-side routing fallback (Bypass path-to-regexp error in Express 5)
    app.use((req, res, next) => {
        if (!req.path.startsWith('/api') && !req.path.startsWith('/events')) {
            return res.sendFile(path.join(staticPath, 'index.html'));
        }
        next();
    });
}

const PORT = CONFIG.PORT;
app.listen(PORT, () => {
    console.log(`[Alchemy API] Running on port ${PORT} (${process.platform})`);
});
