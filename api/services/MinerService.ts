import fs from 'fs/promises';
import path from 'path';
import sqlite3 from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from '../config/index.js';
import { SupabaseService } from './SupabaseService.js';
import { ProcessingEventService } from './ProcessingEventService.js';
import { HistoryEntry, AlchemySettings, BrowserSource } from '../lib/types.js';
import { UrlNormalizer } from '../utils/UrlNormalizer.js';

export class MinerService {
    // Timestamp conversion constants (using BigInt for precision)
    private static readonly WEBKIT_EPOCH_OFFSET_MS = 11644473600000n; // Milliseconds between 1601-01-01 and 1970-01-01
    private static readonly SAFARI_EPOCH_OFFSET_SEC = 978307200;      // Seconds between 1970-01-01 and 2001-01-01




    private static readonly SANITY_CHECK_THRESHOLD = 3000000000000;  // Timestamp threshold for Year ~2065, used to detect invalid/raw format timestamps

    private processingEvents = ProcessingEventService.getInstance();
    private debugMode: boolean = false;

    async mineHistory(settings: AlchemySettings, supabase: SupabaseClient): Promise<HistoryEntry[]> {
        // Enable debug logging if configured
        this.debugMode = settings.debug_logging ?? process.env.DEBUG === 'true';
        // Get blacklist from settings or use defaults
        const blacklist = this.getBlacklist(settings);

        this.debug('settings.custom_browser_paths:', JSON.stringify(settings.custom_browser_paths, null, 2));

        const enabledSources: BrowserSource[] = (settings.custom_browser_paths || []).filter((s: BrowserSource) => {
            this.debug(`Checking source: ${s.path}, enabled: ${s.enabled} (${typeof s.enabled})`);
            return s.enabled === true || (s.enabled as any) === 'true';
        });

        this.debug('enabledSources:', enabledSources.length);

        if (enabledSources.length === 0) {
            this.processingEvents.log({
                eventType: 'warning',
                agentState: 'Idle',
                message: 'No active browser sources configured.'
            }, supabase);
            return [];
        }

        const maxUrlsPerSync = settings.max_urls_per_sync || CONFIG.MAX_HISTORY_ITEMS;
        const syncMode = settings.sync_mode || 'incremental';
        let allEntries: HistoryEntry[] = [];

        // Verify user content
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        for (const source of enabledSources) {
            // Check for stop request
            const { data: currentSettings } = await supabase
                .from('alchemy_settings')
                .select('sync_stop_requested')
                .eq('user_id', userId)
                .single();

            if (currentSettings?.sync_stop_requested) {
                console.log('[MinerService] Sync stop requested by user. Terminating mining loop.');
                await this.processingEvents.log({
                    eventType: 'info',
                    agentState: 'Stopped',
                    message: 'Mining interrupted by user.',
                    level: 'warn',
                    userId
                }, supabase);
                break;
            }

            const sourceStart = Date.now();
            await this.processingEvents.log({
                eventType: 'info',
                agentState: 'Mining',
                message: `Mining source: ${source.label} (${source.browser})...`,
                level: 'info',
                userId
            }, supabase);

            try {
                const entries = await this.mineSource(source, supabase, userId, maxUrlsPerSync, settings);
                allEntries.push(...entries);

                const duration = Date.now() - sourceStart;
                await this.processingEvents.log({
                    eventType: 'info',
                    agentState: 'Mining',
                    message: `Found ${entries.length} URLs from ${source.label}`,
                    details: { source: source.label, count: entries.length },
                    level: 'info',
                    durationMs: duration,
                    userId
                }, supabase);
            } catch (error: any) {
                console.error(`Error mining ${source.label}:`, error);
                const duration = Date.now() - sourceStart;
                await this.processingEvents.log({
                    eventType: 'error',
                    agentState: 'Mining',
                    message: `Failed to mine ${source.label}: ${error.message}`,
                    details: { source: source.label, error: error.message },
                    level: 'error',
                    durationMs: duration,
                    userId
                }, supabase);
            }
        }

        // Cross-source deduplication: if same URL appears in multiple browsers, keep only one
        // Note: URLs are already normalized at this point (line 258), so we can use direct comparison
        const seenNormalizedUrls = new Set<string>();
        const uniqueEntries: HistoryEntry[] = [];
        let crossSourceDupes = 0;

        for (const entry of allEntries) {
            // URLs are already normalized at storage time (line 257), no need to normalize again
            if (!seenNormalizedUrls.has(entry.url)) {
                seenNormalizedUrls.add(entry.url);
                uniqueEntries.push(entry);
            } else {
                crossSourceDupes++;
            }
        }

        if (crossSourceDupes > 0) {
            this.debug(`Cross-source dedup: removed ${crossSourceDupes} duplicates`);
            await this.processingEvents.log({
                eventType: 'info',
                agentState: 'Mining',
                message: `Deduplication: ${crossSourceDupes} cross-browser duplicates removed`,
                level: 'debug',
                userId
            }, supabase);
        }

        // Auto-clear sync_start_date after successful sync
        if (userId && settings.sync_start_date) {
            this.debug('Auto-clearing sync_start_date after successful sync');
            await supabase
                .from('alchemy_settings')
                .update({ sync_start_date: null })
                .eq('user_id', userId);
        }

        return uniqueEntries;
    }

    private async mineSource(
        source: BrowserSource,
        supabase: SupabaseClient,
        userId?: string,
        maxItems?: number,
        settings?: AlchemySettings
    ): Promise<HistoryEntry[]> {
        const historyPath = source.path;
        if (!historyPath) return [];

        // Determine starting timestamp based on simplified sync logic
        // Priority: sync_start_date > last_sync_checkpoint > checkpoint from history_checkpoints
        let startTime: number;

        if (settings?.sync_start_date) {
            // User has set a manual sync start date - use it
            startTime = new Date(settings.sync_start_date).getTime();
            this.debug(`Using sync_start_date: ${new Date(startTime).toISOString()}`);
        } else if (settings?.last_sync_checkpoint) {
            // Use the last checkpoint from settings
            startTime = new Date(settings.last_sync_checkpoint).getTime();
            this.debug(`Using last_sync_checkpoint: ${new Date(startTime).toISOString()}`);
        } else {
            // Fall back to browser-specific checkpoint
            startTime = await this.getCheckpoint(source.path, supabase);
            console.log(`[MinerService] Using browser checkpoint: ${new Date(startTime).toISOString()}`);
        }

        try {
            await fs.access(historyPath);

            // Bypass SQLite lock by copying
            const tempId = uuidv4();
            const tempPath = path.join(CONFIG.DATA_DIR, `history_${tempId}_temp.db`);
            await fs.mkdir(CONFIG.DATA_DIR, { recursive: true });
            await fs.copyFile(historyPath, tempPath);

            const db = new sqlite3(tempPath, { readonly: true });

            let rows: any[] = [];
            const limit = maxItems || CONFIG.MAX_HISTORY_ITEMS;

            try {
                // Adjust query based on browser type
                let query = '';
                let queryParamTime: number | bigint = 0;

                // Normalize checkpoint time to browser-specific format for querying
                queryParamTime = this.fromUnixMs(startTime, source.browser);

                this.debug(`Browser: ${source.browser}`);
                this.debug(`Start Time (Unix Ms): ${startTime}`);
                this.debug(`Query Param Time (Browser Format): ${queryParamTime}`);

                if (source.browser === 'firefox') {
                    query = `
                        SELECT url, title, visit_count, last_visit_date as last_visit_time
                        FROM moz_places
                        WHERE last_visit_date > ? AND url LIKE 'http%'
                        ORDER BY last_visit_date ASC
                        LIMIT ?
                    `;
                } else {
                    // Chrome, Edge, Brave, Arc, Safari (usually)
                    if (source.browser === 'safari') {
                        // Safari: Join visits and items
                        query = `
                            SELECT 
                                i.url, 
                                i.title, 
                                i.visit_count, 
                                v.visit_time as last_visit_time 
                            FROM history_visits v
                            JOIN history_items i ON v.history_item = i.id
                            WHERE v.visit_time > ? 
                            ORDER BY v.visit_time ASC 
                            LIMIT ?
                        `;
                    } else {
                        query = `
                            SELECT url, title, visit_count, last_visit_time 
                            FROM urls 
                            WHERE last_visit_time > ?
                            ORDER BY last_visit_time ASC 
                            LIMIT ?
                        `;
                    }
                }

                try {
                    rows = db.prepare(query).all(queryParamTime, limit) as any[];
                } catch (sqlErr) {
                    console.warn(`SQL Error for ${source.label}:`, sqlErr);
                    // Fallback or skip
                }
            } finally {
                // Always close database and clean up temp file
                db.close();
                await fs.unlink(tempPath);
            }

            // Track seen normalized URLs for deduplication within this batch
            const seenUrls = new Set<string>();
            let skippedDuplicates = 0;
            let skippedNonContent = 0;
            let skippedBlacklist = 0;

            // Get blacklist for this sync
            const blacklist = this.getBlacklist(settings);

            const entries: HistoryEntry[] = rows
                .filter(row => {
                    if (!row.url) return false;

                    // 1. Blacklist check (domain-level)
                    if (blacklist.some(b => row.url.includes(b))) {
                        skippedBlacklist++;
                        return false;
                    }

                    // 2. Non-content URL check (login pages, APIs, assets, etc.)
                    if (UrlNormalizer.isLikelyNonContent(row.url)) {
                        skippedNonContent++;
                        return false;
                    }

                    // 3. Normalize and deduplicate
                    const normalizedUrl = UrlNormalizer.normalize(row.url);
                    if (seenUrls.has(normalizedUrl)) {
                        skippedDuplicates++;
                        return false;
                    }
                    seenUrls.add(normalizedUrl);

                    return true;
                })
                .map(row => ({
                    id: uuidv4(),
                    url: UrlNormalizer.normalize(row.url), // Store normalized URL
                    title: row.title || 'Untitled',
                    visit_count: row.visit_count || 1,
                    // Normalize back to Unix Ms for internal storage/usage
                    last_visit_time: this.toUnixMs(row.last_visit_time, source.browser),
                    browser: source.browser,
                    source: source.label || 'browser_history'
                }));

            // Log filtering stats
            if (skippedDuplicates > 0 || skippedNonContent > 0 || skippedBlacklist > 0) {
                this.debug(`URL Filtering: ${skippedDuplicates} duplicates, ${skippedNonContent} non-content, ${skippedBlacklist} blacklisted`);
            }

            if (rows.length > 0) {
                // Since we order ASC, the last row is the latest time in this batch
                const lastRow = rows[rows.length - 1];
                const newestTime = this.toUnixMs(lastRow.last_visit_time, source.browser);

                await this.saveCheckpoint(source.path, newestTime, supabase, userId);

                // Also update last_sync_checkpoint in settings for global tracking
                if (userId && settings) {
                    await supabase
                        .from('alchemy_settings')
                        .update({ last_sync_checkpoint: new Date(newestTime).toISOString() })
                        .eq('user_id', userId);
                }
            }

            return entries;

        } catch (error) {
            throw error;
        }
    }

    private toUnixMs(timestamp: number | bigint, browser: string): number {
        if (!timestamp) return Date.now();

        if (browser === 'firefox') {
            // Firefox: Microseconds -> Milliseconds
            return Number(BigInt(timestamp) / 1000n);
        } else if (browser === 'safari') {
            // Safari: Seconds (float) since 2001 -> Unix Ms
            // Safari uses floats (CFAbsoluteTime), keep as Number
            return Math.floor((Number(timestamp) + MinerService.SAFARI_EPOCH_OFFSET_SEC) * 1000);
        } else {
            // Chrome/Webkit: Microseconds since 1601 -> Unix Ms
            const ts = BigInt(timestamp);
            const microDiff = ts - (MinerService.WEBKIT_EPOCH_OFFSET_MS * 1000n);
            return Number(microDiff / 1000n);
        }
    }

    private fromUnixMs(unixMs: number, browser: string): number | bigint {
        if (!unixMs) return 0;

        if (browser === 'firefox') {
            // Firefox: Milliseconds -> Microseconds (BigInt)
            return BigInt(unixMs) * 1000n;
        } else if (browser === 'safari') {
            // Safari: Unix Ms -> Seconds since 2001 (Float)
            return (unixMs / 1000) - MinerService.SAFARI_EPOCH_OFFSET_SEC;
        } else {
            // Chrome/Webkit: Unix Ms -> Microseconds since 1601 (BigInt)
            // (UnixMs + OffsetMs) * 1000 = Microseconds
            const unixBig = BigInt(unixMs);
            return (unixBig + MinerService.WEBKIT_EPOCH_OFFSET_MS) * 1000n;
        }
    }

    private async getCheckpoint(browser: string, supabase: SupabaseClient): Promise<number> {
        const { data } = await supabase
            .from('history_checkpoints')
            .select('last_visit_time')
            .eq('browser', browser)
            .limit(1)
            .maybeSingle();

        let checkpoint = data?.last_visit_time || 0;

        // Sanity Check: If checkpoint is from the "future" (likely old raw Chrome timestamp)
        // Chrome timestamps (microseconds) are ~10^16
        // Unix Ms timestamps are ~10^12
        if (checkpoint > MinerService.SANITY_CHECK_THRESHOLD) {
            console.warn(`[MinerService] Checkpoint ${checkpoint} looks invalid (too large/raw format). Resetting to 0.`);
            return 0;
        }

        return checkpoint;
    }

    private async saveCheckpoint(browser: string, time: number, supabase: SupabaseClient, userId?: string): Promise<void> {
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

    /**
     * Conditional debug logging - only logs when debug mode is enabled
     */
    private debug(...args: any[]): void {
        if (this.debugMode) {
            console.log('[MinerService]', ...args);
        }
    }

    /**
     * Get blacklist domains from settings or use defaults
     */
    private getBlacklist(settings?: AlchemySettings): string[] {
        return settings?.blacklist_domains || [
            'google.com/search',
            'localhost:',
            '127.0.0.1',
            'facebook.com',
            'twitter.com',
            'instagram.com',
            'linkedin.com/feed',
        ];
    }
}
