import { SupabaseClient } from '@supabase/supabase-js';
import path from 'path';
import os from 'os';
import { Engine, Asset, Signal, AlchemySettings, ProductionBrief } from '../lib/types.js';
import { SDKService } from './SDKService.js';
import { embeddingService } from './EmbeddingService.js';
import { ContentCleaner } from '../utils/contentCleaner.js';
import { BLOCKED_TAGS as DEFAULT_BLOCKED_TAGS } from '../../shared/constants.js';

export class TransmuteService {

    /**
     * Run a specific engine pipeline
     */
    async runEngine(
        engineId: string,
        userId: string,
        supabase: SupabaseClient
    ): Promise<Asset> {
        console.log(`[Transmute] Running engine ${engineId}...`);

        // 1. Fetch Engine Config
        const { data: engine, error } = await supabase
            .from('engines')
            .select('*')
            .eq('id', engineId)
            .single();

        if (error || !engine) {
            throw new Error(`Engine not found: ${error?.message}`);
        }

        // 2. Fetch Context (Signals)
        const signals = await this.fetchContextSignals(userId, engine.config, supabase);

        if (signals.length === 0) {
            console.warn('[Transmute] No signals found for context');
        }

        // Branch logic: Local vs Desktop
        const executionMode = engine.config.execution_mode || 'local';

        if (executionMode === 'desktop') {
            // DELEGATION FLOW
            console.log('[Transmute] Delegating to Desktop Agent...');

            // 3a. Create Pending Asset
            const assetStub = await this.saveAsset(engine, null, signals, userId, supabase, 'pending');

            // 3b. Construct Stateless Brief (Optimized)
            const brief = await this.generateProductionBrief(
                engine,
                signals,
                userId,
                assetStub.id,
                supabase
            );

            // 3c. Trigger Agent
            try {
                await SDKService.triggerAgent('alchemy.create_asset', brief);

                // 3d. Update status to processing
                await supabase
                    .from('assets')
                    .update({ status: 'processing' })
                    .eq('id', assetStub.id);

                return { ...assetStub, status: 'processing' };
            } catch (error: any) {
                console.error('[Transmute] Failed to trigger desktop agent:', error);
                await supabase
                    .from('assets')
                    .update({ status: 'failed', error_message: error.message })
                    .eq('id', assetStub.id);
                throw error;
            }

        } else {
            // LOCAL LLM FLOW (Legacy)
            // 3. Generate Content (LLM)
            const content = await this.generateAssetContent(engine, signals);

            // 4. Save Asset
            const asset = await this.saveAsset(engine, content, signals, userId, supabase, 'completed');

            // 5. Update Engine Status
            await supabase
                .from('engines')
                .update({ last_run_at: new Date().toISOString() })
                .eq('id', engineId);

            console.log(`[Transmute] Engine run complete. Asset created: ${asset.id}`);
            return asset;
        }
    }

    /**
     * Get the production brief for inspection (doesn't trigger run)
     */
    async getProductionBrief(
        engineId: string,
        userId: string,
        supabase: SupabaseClient
    ): Promise<ProductionBrief> {
        // 1. Fetch Engine Config
        const { data: engine, error } = await supabase
            .from('engines')
            .select('*')
            .eq('id', engineId)
            .single();

        if (error || !engine) {
            throw new Error(`Engine not found: ${error?.message}`);
        }

        // 2. Fetch Context (Signals)
        const signals = await this.fetchContextSignals(userId, engine.config, supabase);

        // 3. Generate Stateless Brief
        return this.generateProductionBrief(engine, signals, userId, 'preview-mode', supabase);
    }

    /**
     * Generate a stateless production brief for the Desktop Studio
     * Optimized for token efficiency and high quality directives
     */
    private async generateProductionBrief(
        engine: Engine,
        signals: Signal[],
        userId: string,
        assetId: string,
        supabase: SupabaseClient
    ): Promise<ProductionBrief> {
        // 1. Fetch User Persona (for personalization)
        const { data: persona } = await supabase
            .from('user_personas')
            .select('interest_summary, anti_patterns')
            .eq('user_id', userId)
            .maybeSingle();

        // 2. Fetch App Data Dir for absolute path (Drop Zone)
        // Cross-platform fallback: ~/RealTimeX/Alchemy/data
        let appDataDir = path.join(os.homedir(), 'RealTimeX', 'Alchemy', 'data');
        try {
            appDataDir = await SDKService.getAppDataDir();
        } catch (e) {
            console.warn('[Transmute] Could not fetch app data dir from SDK, using fallback');
        }

        // 3. Map Signals to brief format with CLEANED content and DIRECT urls
        const signalsBrief = signals.map(s => {
            // Aggregated all known URLs for this signal
            const sourceUrls = s.metadata?.source_urls || [s.url];
            const uniqueUrls = [...new Set([s.url, ...sourceUrls])];

            // Pick the "best" URL: Prioritize long URLs and avoid shortened ones
            // Filter out 't.co' and pick longest as heuristic for final article
            const unmaskedUrls = uniqueUrls.filter(u => !u.includes('t.co') && !u.includes('bit.ly'));
            const bestUrl = unmaskedUrls.length > 0
                ? unmaskedUrls.reduce((a, b) => a.length > b.length ? a : b)
                : s.url;

            return {
                title: s.title,
                summary: s.summary,
                url: bestUrl, // Best Available (Resolved) URL
                source_urls: uniqueUrls, // All associated direct URLs
                // Return clean/raw content (already cleaned by RouterService)
                content: s.content || undefined
            };
        });

        // 4. Construct high-fidelity System Prompt
        let systemPrompt = "You are a specialized AI content creator.";
        if (engine.type === 'newsletter') {
            systemPrompt = "You are a senior tech editor. Write a newsletter summarizing the provided context. Use a professional, insight-driven tone. Structure with 'The Big Story' followed by 'Quick Hits'.";
        } else if (engine.type === 'thread') {
            systemPrompt = "You are a viral storyteller. Create an engaging X/Twitter thread based on the top signal provided. Use hook-driven writing and informative formatting.";
        } else if (engine.type === 'audio') {
            systemPrompt = "You are a podcast scriptwriter. Create a natural, conversational script based on the signals provided. The goal is a 5-minute daily update for a busy professional.";
        }

        const filename = `transmute_${engine.type}_${assetId}.md`;
        const systemPath = path.join(appDataDir, 'assets', filename);

        // 5. Construct the self-contained JSON
        return {
            agent_name: `alchemy-${engine.type}`,
            auto_run: true,
            raw_data: {
                job_id: assetId,
                context: {
                    title: `${engine.title} - ${new Date().toLocaleDateString()}`,
                    signals: signalsBrief,
                    user_persona: persona ? {
                        interest_summary: persona.interest_summary,
                        anti_patterns: persona.anti_patterns
                    } : undefined
                },
                directives: {
                    prompt: engine.config.custom_prompt || "Create a high-quality asset based on the provided context.",
                    system_prompt: systemPrompt,
                    ...engine.config,
                    engine_type: engine.type,
                    execution_mode: 'desktop'
                },
                output_config: {
                    target_asset_id: assetId,
                    filename: filename,
                    system_path: systemPath
                }
            }
        };
    }

    /**
     * Fetch relevant signals based on engine configuration
     */
    private async fetchContextSignals(
        userId: string,
        config: any,
        supabase: SupabaseClient
    ): Promise<Signal[]> {
        const maxSignals = config.max_signals || 10;

        let query = supabase
            .from('signals')
            .select('*')
            .eq('user_id', userId)
            .order('score', { ascending: false })
            .limit(maxSignals);

        // Support both single category (legacy) and multi-select categories
        const categories = Array.isArray(config.category) ? config.category : (config.category ? [config.category] : []);

        if (categories.length > 0 && !categories.includes('All')) {
            // Use OR logic for multiple categories
            query = query.in('category', categories);
        }

        // HIGHLIGHT: Support tag-based filtering (Dynamic Tag Engines)
        if (config.tag) {
            const normalizedTag = config.tag.toLowerCase().trim();
            console.log(`[Transmute] Filtering by tag: "${normalizedTag}" (original: "${config.tag}")`);
            query = query.contains('tags', [normalizedTag]);
        }

        const { data, error } = await query;
        if (error) {
            console.error('[Transmute] Signal query failed:', error);
            return [];
        }

        console.log(`[Transmute] Retrieved ${data?.length || 0} signals for user ${userId}`);
        return (data || []) as Signal[];
    }

    /**
     * Generate the asset content using LLM
     */
    private async generateAssetContent(engine: Engine, signals: Signal[]): Promise<string> {
        // Construct Context String
        const contextStr = signals.map(s =>
            `- [${s.score}] ${s.title}\n  Summary: ${s.summary}\n  URL: ${s.url}`
        ).join('\n\n');

        // Select System Prompt based on Engine Type
        let systemPrompt = "You are an expert editor.";
        let userPrompt = "";

        if (engine.config.custom_prompt) {
            systemPrompt = engine.config.custom_prompt;
            userPrompt = `Context:\n${contextStr}`;
        } else if (engine.type === 'newsletter') {
            systemPrompt = "You are a curator writing a daily newsletter. Tone: Professional but engaging.";
            userPrompt = `Write a newsletter based on these top stories:\n\n${contextStr}\n\nFormat:\n# Title\n\n## Deep Dive (Top Story)\n...\n\n## Quick Hits\n...`;
        } else if (engine.type === 'thread') {
            systemPrompt = "You are a social media growth expert. Write viral threads.";
            userPrompt = `Create a Twitter/X thread based on this top signal:\n${contextStr}\n\nFormat: 1 tweet per block.`;
        } else {
            userPrompt = `Synthesize these signals into a report:\n\n${contextStr}`;
        }

        // Call LLM via SDK
        const sdk = SDKService.getSDK();
        if (!sdk) {
            throw new Error('RealTimeX SDK not available. Please ensure the desktop app is running.');
        }

        // Use engine config for model/provider if available, else defaults
        const provider = engine.config.llm_provider || 'realtimexai';
        const model = engine.config.llm_model || 'gpt-4o-mini';

        const response = await sdk.llm.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ], {
            provider,
            model
        });

        return response.response?.content || "Failed to generate content.";
    }

    /**
     * Ensure default newsletter engines exist for each category
     */
    /**
     * Ensure default newsletter engines exist for each category
     * This is "Self-Healing": it creates missing engines based on discovered signals.
     */
    async ensureDefaultNewsletterEngines(
        userId: string,
        supabase: SupabaseClient
    ): Promise<void> {
        console.log(`[Transmute] Running Self-Healing Engine Discovery for user ${userId}...`);

        // 1. Fetch Active Categories from Signals
        // We only create engines for categories that actually have data.
        const { data: signalStats } = await supabase
            .from('signals')
            .select('category')
            .eq('user_id', userId);

        const activeCategories = new Set(signalStats?.map(s => s.category).filter(Boolean) || []);

        // 2. Fetch Existing Pipelines to avoid duplicates
        const { data: existingEngines } = await supabase
            .from('engines')
            .select('title, config')
            .eq('user_id', userId)
            .eq('type', 'newsletter');

        const existingTitles = new Set(existingEngines?.map(e => e.title) || []);
        const existingCategories = new Set(existingEngines?.map(e => e.config?.category).filter(Boolean));
        const existingTags = new Set(existingEngines?.map(e => e.config?.tag?.toLowerCase().trim()).filter(Boolean));

        // 3. Create Engines for Active Categories (Exclude 'Other')
        for (const category of activeCategories) {
            // Filter out 'Other' (case-insensitive) and empty strings
            if (!category || category.toLowerCase() === 'other') continue;

            // STRICT 1:1 CHECK: Skip if title exists OR category is already covered
            const title = `${category} Daily`;
            if (existingTitles.has(title) || existingCategories.has(category)) {
                continue;
            }

            console.log(`[Transmute] Bootstrapping missing category engine: ${title}`);

            const config = {
                category,
                execution_mode: 'desktop',
                schedule: 'Daily',
                llm_provider: 'realtimexai',
                llm_model: 'gpt-4o',
                max_signals: 30,
                custom_prompt: `Create a comprehensive daily newsletter focused on ${category}. Highlight the most important developments, key insights, and actionable takeaways. Use a professional, insight-driven tone with clear structure: start with 'The Big Story' followed by 'Quick Hits' for other notable items.`
            };

            await supabase
                .from('engines')
                .insert({
                    user_id: userId,
                    title: title,
                    type: 'newsletter',
                    config: config,
                    status: 'active'
                });
        }

        // 4. Dynamic Tag-Based Categories
        // De-prioritized for now to reduce noise. 
        // Only run if the threshold is very high or if category mapping isn't enough.
        // await this.ensureDynamicTagEngines(userId, supabase, existingTitles, existingTags);
    }

    /**
     * Find popular tags and create engines for them
     * Treat popular tags as "dynamic categories" with 1:1 mapping.
     */
    private async ensureDynamicTagEngines(
        userId: string,
        supabase: SupabaseClient,
        existingTitles: Set<string>,
        existingTags: Set<string>
    ): Promise<void> {
        // 1. Fetch all tags for the user
        const { data: signals } = await supabase
            .from('signals')
            .select('tags')
            .eq('user_id', userId);

        if (!signals || signals.length === 0) return;

        // 2. Fetch User Settings (for blocked tags)
        const { data: settings } = await supabase
            .from('alchemy_settings')
            .select('blocked_tags')
            .eq('user_id', userId)
            .maybeSingle();

        const userBlockedTags = new Set(((settings?.blocked_tags || []) as string[]).map(t => t.toLowerCase().trim()));

        // Use user blocked tags if they exist, otherwise fallback to system defaults
        const systemDefaults = Array.from(DEFAULT_BLOCKED_TAGS).map(t => t.toLowerCase().trim());
        const BLOCKED_TAGS = userBlockedTags.size > 0 ? userBlockedTags : new Set(systemDefaults);

        // Core category terms to skip (already handled by category discovery)
        const CORE_CATEGORY_TERMS = new Set([
            'ai', 'ml', 'machine learning', 'artificial intelligence',
            'business', 'technology', 'tech', 'finance', 'financial',
            'crypto', 'cryptocurrency', 'bitcoin', 'science', 'scientific',
            'politics', 'political', 'government'
        ]);

        const tagCounts = new Map<string, number>();
        const DYNAMIC_THRESHOLD = 50; // Increased significantly to reduce noise for now
        const MAX_NEW_PER_RUN = 3;

        signals.forEach(s => {
            const tags = (s.tags || []) as string[];
            tags.forEach(tag => {
                const lower = tag.toLowerCase().trim();
                // Filter out: empty, short, blocked, or core category overlaps
                // Added check for 'redirect' and other junk specifically
                if (!lower || lower.length < 3 || BLOCKED_TAGS.has(lower) || CORE_CATEGORY_TERMS.has(lower) || lower.includes('redirect')) {
                    return;
                }
                tagCounts.set(lower, (tagCounts.get(lower) || 0) + 1);
            });
        });

        // 3. Identify and Sort Candidates
        const candidates = Array.from(tagCounts.entries())
            .filter(([_, count]) => count >= DYNAMIC_THRESHOLD)
            .sort((a, b) => b[1] - a[1]);

        let createdCount = 0;

        for (const [tag, count] of candidates) {
            const displayName = tag.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            const title = `${displayName} Daily`;

            // STRICT 1:1 CHECK: Skip if title exists OR tag is already covered
            if (existingTitles.has(title) || existingTags.has(tag)) {
                continue;
            }

            console.log(`[Transmute] Creating dynamic tag engine for "${tag}" (${count} signals)`);

            const config = {
                tag,
                execution_mode: 'desktop',
                schedule: 'Daily',
                llm_provider: 'realtimexai',
                llm_model: 'gpt-4o'
            };

            const { error } = await supabase
                .from('engines')
                .insert({
                    user_id: userId,
                    title: title,
                    type: 'newsletter',
                    config: config,
                    status: 'active'
                });

            if (!error) createdCount++;
        }

        if (createdCount > 0) {
            console.log(`[Transmute] Successfully auto-created ${createdCount} dynamic tag engines.`);
        }
    }

    /**
     * Save the generated asset to DB
     */
    private async saveAsset(
        engine: Engine,
        content: string | null,
        sourceSignals: Signal[],
        userId: string,
        supabase: SupabaseClient,
        status: 'pending' | 'processing' | 'completed' | 'failed' = 'completed'
    ): Promise<Asset> {
        const { data, error } = await supabase
            .from('assets')
            .insert({
                user_id: userId,
                engine_id: engine.id,
                title: `${engine.title} - ${new Date().toLocaleDateString()}`,
                type: 'markdown', // Default to markdown for now
                content: content,
                status: status,
                metadata: {
                    source_signal_count: sourceSignals.length,
                    source_signals: sourceSignals.map(s => s.id)
                }
            })
            .select()
            .single();

        if (error) throw error;
        return data as Asset;
    }
}

export const transmuteService = new TransmuteService();
