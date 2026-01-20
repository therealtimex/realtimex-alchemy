import fs from 'fs/promises';
import path from 'path';
import sqlite3 from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG, BROWSER_PATHS } from '../config/index.js';
import { EventService } from './EventService.js';
import { SupabaseService } from './SupabaseService.js';

export interface HistoryEntry {
    id: string;
    url: string;
    title: string;
    visit_count: number;
    last_visit_time: number;
    browser: string;
}

export class MinerService {
    private events = EventService.getInstance();
    private blacklist = [
        'google.com/search',
        'localhost:',
        '127.0.0.1',
        'facebook.com',
        'twitter.com',
        'instagram.com',
        'linkedin.com/feed',
    ];

    async mineHistory(browser: string): Promise<HistoryEntry[]> {
        const platform = process.platform;
        const historyPath = BROWSER_PATHS[platform]?.[browser];

        if (!historyPath) {
            throw new Error(`Browser ${browser} not supported on ${platform}`);
        }

        this.events.emit({ type: 'miner', message: `Scanning ${browser} History...` });

        const lastCheckTime = await this.getCheckpoint(browser);

        try {
            await fs.access(historyPath);

            // Bypass SQLite lock by copying
            const tempPath = path.join(CONFIG.DATA_DIR, `history_${browser}_temp.db`);
            await fs.mkdir(CONFIG.DATA_DIR, { recursive: true });
            await fs.copyFile(historyPath, tempPath);

            const db = new sqlite3(tempPath, { readonly: true });
            const query = `
                SELECT url, title, visit_count, last_visit_time 
                FROM urls 
                WHERE last_visit_time > ?
                ORDER BY last_visit_time DESC 
                LIMIT ?
            `;

            const rows = db.prepare(query).all(lastCheckTime, CONFIG.MAX_HISTORY_ITEMS) as any[];
            db.close();
            await fs.unlink(tempPath);

            const entries: HistoryEntry[] = rows
                .filter(row => !this.blacklist.some(b => row.url.includes(b)))
                .map(row => ({
                    id: uuidv4(),
                    url: row.url,
                    title: row.title || 'Untitled',
                    visit_count: row.visit_count,
                    last_visit_time: row.last_visit_time,
                    browser
                }));

            if (entries.length > 0) {
                const newestTime = Math.max(...entries.map(e => e.last_visit_time));
                await this.saveCheckpoint(browser, newestTime);
            }

            this.events.emit({ type: 'miner', message: `Found ${entries.length} new candidate URLs` });
            return entries;
        } catch (error: any) {
            this.events.emit({ type: 'miner', message: `Error mining ${browser}: ${error.message}` });
            throw error;
        }
    }

    private async getCheckpoint(browser: string): Promise<number> {
        if (!SupabaseService.isConfigured()) return 0;

        const supabase = SupabaseService.getServiceRoleClient();
        const { data } = await supabase
            .from('history_checkpoints')
            .select('last_visit_time')
            .eq('browser', browser)
            .limit(1)
            .single();

        return data?.last_visit_time || 0;
    }

    private async saveCheckpoint(browser: string, time: number): Promise<void> {
        if (!SupabaseService.isConfigured()) return;

        const supabase = SupabaseService.getServiceRoleClient();
        const userId = await this.getSystemUserId();
        if (!userId) return;

        await supabase
            .from('history_checkpoints')
            .upsert({
                user_id: userId,
                browser,
                last_visit_time: time,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,browser' });
    }

    private async getSystemUserId(): Promise<string | null> {
        const supabase = SupabaseService.getServiceRoleClient();
        const { data } = await supabase.from('signals').select('user_id').limit(1).single();
        if (data?.user_id) return data.user_id;

        // Fallback: try to find any user (for CLI simplicity)
        const { data: userData } = await supabase.rpc('get_any_user_id');
        // Note: I'll need to define this RPC or a better way to get the admin user ID
        return userData || null;
    }
}
