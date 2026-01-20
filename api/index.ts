import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { MinerService } from './services/MinerService.js';
import { AlchemistService } from './services/AlchemistService.js';
import { LibrarianService } from './services/LibrarianService.js';
import { CONFIG } from './config/index.js';
import { EventService } from './services/EventService.js';
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

// Get signals
app.get('/api/signals', async (req: Request, res: Response) => {
    try {
        const signals = await librarian.getSignals();
        res.json(signals);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch signals' });
    }
});

// Test/Debug endpoints
app.get('/api/test/mine/:browser', async (req: Request, res: Response) => {
    const { browser } = req.params;
    try {
        const history = await miner.mineHistory(browser);
        res.json({ count: history.length, items: history.slice(0, 5) });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/test/analyze', async (req: Request, res: Response) => {
    const { text, provider } = req.body;
    try {
        const result = await alchemist.analyzeSignal(text, provider);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
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
