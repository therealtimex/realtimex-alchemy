import { SupabaseClient } from '@supabase/supabase-js';
import { HistoryEntry, Signal, AlchemySettings } from '../lib/types.js';
import { ProcessingEventService } from './ProcessingEventService.js';
import { RouterService } from './RouterService.js';
import { embeddingService } from './EmbeddingService.js';
import { deduplicationService } from './DeduplicationService.js';
import { SDKService } from './SDKService.js';
import { ContentCleaner } from '../utils/contentCleaner.js';
import { transmuteService } from './TransmuteService.js';

export interface AlchemistResponse {
    score: number;
    summary: string;
    category: string;
    entities: string[];
    tags: string[];
    relevant: boolean;
}

export class AlchemistService {
    private processingEvents: ProcessingEventService;
    private router: RouterService;

    constructor() {
        this.processingEvents = ProcessingEventService.getInstance();
        this.router = new RouterService();
    }

    async process(entries: HistoryEntry[], settings: any, supabase: SupabaseClient, userId: string, syncStartTime?: number) {
        if (!entries || entries.length === 0) return;

        // 0. Fetch Learning Context (Active Learning: Persona + Short-term)
        console.log('[AlchemistService] Fetching learning context...');

        // Fetch Blacklist
        const { data: settingsData } = await supabase
            .from('alchemy_settings')
            .select('blacklist_domains')
            .eq('user_id', userId)
            .single();
        const blacklist = (settingsData?.blacklist_domains || []) as string[];

        // A. Fetch User Persona (Long-term Memory)
        const { data: persona } = await supabase
            .from('user_persona')
            .select('*')
            .eq('user_id', userId)
            .single();

        // B. Fetch Recent Explicit Directives (Short-term / High Priority)
        // User Notes (Last 5)
        const { data: userNotes } = await supabase
            .from('signals')
            .select('title, user_notes')
            .eq('user_id', userId)
            .not('user_notes', 'is', null)
            .order('updated_at', { ascending: false })
            .limit(5);

        // Recent Boosts (Last 5) - Immediate Drift
        const { data: recentBoosts } = await supabase
            .from('signals')
            .select('title, summary')
            .eq('user_id', userId)
            .eq('is_boosted', true)
            .order('created_at', { ascending: false })
            .limit(5);

        // Filter entries based on blacklist
        const allowedEntries = entries.filter(entry => {
            try {
                const domain = new URL(entry.url).hostname;
                const isBlacklisted = blacklist.some(b => domain.includes(b));
                if (isBlacklisted) {
                    console.log(`[AlchemistService] Skipped blacklisted domain: ${domain}`);
                }
                return !isBlacklisted;
            } catch (e) {
                return false;
            }
        });

        if (allowedEntries.length === 0) {
            console.log('[AlchemistService] No entries remaining after blacklist filtering.');
            return;
        }

        // Prepare Learning Context String
        let learningContext = "";

        // 1. Long-term Persona (Base Layer)
        if (persona) {
            learningContext += `\nUSER PERSONA (Long-term Profile):\n`;
            learningContext += `Interests: ${persona.interest_summary}\n`;
            learningContext += `Dislikes: ${persona.anti_patterns}\n`;
        }

        // 2. Short-term / Explicit (Overlay Layer)
        if (recentBoosts && recentBoosts.length > 0) {
            learningContext += `\nIMMEDIATE PRIORITIES (Recent Boosts):\n`;
            recentBoosts.forEach(b => learningContext += `- ${b.title}: ${b.summary}\n`);
        }
        if (userNotes && userNotes.length > 0) {
            learningContext += `\nUSER DIRECTIVES (Explicit Notes - Override Rules):\n`;
            userNotes.forEach(n => learningContext += `- Regarding "${n.title}": "${n.user_notes}"\n`);
        }

        // Track stats for completion event
        const stats = {
            total: allowedEntries.length,
            signals: 0,
            skipped: 0,
            errors: 0
        };

        // Resolve LLM provider dynamically
        const llmConfig = await SDKService.resolveChatProvider(settings);
        console.log('[AlchemistService] LLM Config:', llmConfig);

        for (const entry of allowedEntries) {
            // Emit: Reading
            await this.processingEvents.log({
                eventType: 'analysis',
                agentState: 'Reading',
                message: `Reading content from: ${entry.url}`,
                level: 'info',
                userId
            }, supabase);

            try {
                // 2. Extract Content via RouterService (Tier 1 → Tier 2 fallback)
                let content = '';
                let finalUrl = entry.url; // Default to entry URL

                let isGatedContent = false;

                try {
                    const result = await this.router.extractContent(entry.url);
                    let rawContent = result.content;
                    finalUrl = result.finalUrl;

                    if (rawContent && rawContent.length > 20) {
                        // HIGHLIGHT: Payload Hygiene - Content is already cleaned by RouterService
                        const cleaned = rawContent;

                        // Check if this is a login wall or paywall
                        isGatedContent = ContentCleaner.isGatedContent(cleaned);

                        if (isGatedContent) {
                            console.log(`[AlchemistService] Gated content detected: ${entry.url}`);
                            content = `Page Title: ${entry.title} (Login/paywall required - content not accessible)`;
                        } else {
                            // Truncate to avoid token limits (keep ~8000 chars)
                            const truncated = cleaned.length > 10000 ? cleaned.substring(0, 10000) + '...' : cleaned;
                            content = `Page Title: ${entry.title}\nContent: ${truncated}`;
                        }
                    } else {
                        content = `Page Title: ${entry.title} (Content unavailable or too short)`;
                    }
                } catch (scrapeError: any) {
                    console.warn(`Extraction failed for ${entry.url}:`, scrapeError.message);
                    content = `Page Title: ${entry.title}. URL: ${entry.url} (Extraction failed)`;
                }

                // Emit: Analyzing
                const startAnalysis = Date.now();
                await this.processingEvents.log({
                    eventType: 'analysis',
                    agentState: 'Thinking',
                    message: `Analyzing relevance of: ${entry.title}`,
                    level: 'info',
                    userId
                }, supabase);

                // 3. LLM Analysis
                const response = await this.analyzeContent(content, finalUrl, settings, learningContext);

                const duration = Date.now() - startAnalysis;

                // 4. Save Signal (ALWAYS save for Active Learning - Low scores = candidates for boost)
                console.log(`[AlchemistService] Saving signal (${response.score}%)...`);

                const { data: insertedSignal, error: insertError } = await supabase
                    .from('signals')
                    .insert([{
                        user_id: userId,
                        url: finalUrl,
                        title: entry.title,
                        score: isGatedContent ? Math.min(response.score, 20) : response.score, // Cap gated content at 20
                        summary: isGatedContent ? 'Login or subscription required to access this content.' : response.summary,
                        category: response.category,
                        entities: response.entities,
                        tags: (response.tags || []).map(t => t.toLowerCase().trim()),
                        content: content,
                        // Mark as dismissed if low score OR gated content
                        is_dismissed: response.score < 50 || isGatedContent,
                        metadata: {
                            original_source_url: entry.url,
                            resolved_at: new Date().toISOString(),
                            is_gated: isGatedContent
                        }
                    }])
                    .select()
                    .single();

                if (insertError) {
                    console.error('[AlchemistService] Insert error:', insertError);
                    stats.errors++;
                } else {
                    console.log('[AlchemistService] Signal saved successfully');

                    if (response.relevant) {
                        // High/Medium Score: Emit Signal Found & Auto-Embed
                        await this.processingEvents.log({
                            eventType: 'action',
                            agentState: 'Signal',
                            message: `Found signal: ${response.summary} (${response.score}%)`,
                            level: 'info',
                            metadata: response,
                            durationMs: duration,
                            userId
                        }, supabase);

                        stats.signals++;

                        // 5. Generate Embedding & Check for Duplicates (non-blocking)
                        if (settings.embedding_model && await embeddingService.isAvailable()) {
                            await this.processEmbedding(insertedSignal, settings, userId, supabase).catch((err: any) => {
                                console.error('[AlchemistService] Embedding processing failed:', err);
                            });
                        }
                    } else {
                        // Low Score: Emit Skipped (but it IS saved in DB now)
                        // Trigger metadata-based deduplication (no embedding) to merge tracking links/redirects
                        await this.processDeduplicationOnly(insertedSignal, settings, userId, supabase).catch((err: any) => {
                            console.error('[AlchemistService] Deduplication check failed:', err);
                        });

                        await this.processingEvents.log({
                            eventType: 'info',
                            agentState: 'Skipped',
                            message: `Low signal stored for review (${response.score}%): ${entry.title}`,
                            level: 'debug',
                            durationMs: duration,
                            userId
                        }, supabase);

                        // We count it as 'skipped' for the summary stats even though it's physically in the DB,
                        // because it's not a "Found Signal" in the user's main feed context.
                        stats.skipped++;
                    }
                }

            } catch (error: any) {
                console.error(`Error analyzing ${entry.url}:`, error);
                await this.processingEvents.log({
                    eventType: 'error',
                    agentState: 'Error',
                    message: `Analysis failed for ${entry.title}: ${error.message}`,
                    level: 'error',
                    userId
                }, supabase);
                stats.errors++;
            }
        }

        // Emit: Sync Completed
        const totalDuration = syncStartTime ? Date.now() - syncStartTime : 0;
        await this.processingEvents.log({
            eventType: 'info',
            agentState: 'Completed',
            message: `Sync completed: ${stats.signals} signals found, ${stats.skipped} skipped, ${stats.errors} errors`,
            level: 'info',
            durationMs: totalDuration,
            metadata: {
                is_completion: true,
                total_urls: stats.total,
                signals_found: stats.signals,
                skipped: stats.skipped,
                errors: stats.errors,
                duration_seconds: Math.round(totalDuration / 1000)
            },
            userId
        }, supabase);

        // 6. Trigger Background Engine Discovery (NEW: Dynamically create engines after sync)
        transmuteService.ensureDefaultNewsletterEngines(userId, supabase).catch(err => {
            console.error('[AlchemistService] Background engine discovery failed:', err);
        });

        // 7. Trigger Background Persona Consolidation (don't await)
        import('./PersonaService.js').then(({ personaService }) => {
            personaService.consolidatePersona(userId, supabase).catch(err => {
                console.error('[AlchemistService] Background persona update failed:', err);
            });
        });
    }

    private async analyzeContent(content: string, url: string, settings: AlchemySettings, learningContext: string = ""): Promise<AlchemistResponse> {
        const sdk = SDKService.getSDK();
        if (!sdk) {
            throw new Error('RealTimeX SDK not available');
        }

        // Resolve LLM provider dynamically from SDK
        const { provider, model } = await SDKService.resolveChatProvider(settings);

        const prompt = `
        Act as "The Alchemist", a high-level intelligence analyst.
        Analyze the following article value based on the content and the User's Interests.

        ${learningContext}

        Input:
        URL: ${url}
        Content: ${content}

        CRITICAL RULES:

        1. REJECT JUNK PAGES (Score = 0):
           - Login pages, authentication walls, "sign in to continue"
           - Navigation menus, site footers, cookie notices
           - "Page not found", error pages, access denied
           - App store pages, download prompts
           - Empty or placeholder content
           For these, return: score=0, category="Other", summary="[Login wall/Navigation page/etc]", tags=[], entities=[]

        2. SCORING GUIDE:
           - High (80-100): Original research, data, insights, technical depth. MATCHES USER INTERESTS.
           - Medium (50-79): Industry news, tutorials, useful summaries.
           - Low (1-49): Marketing fluff, clickbait, thin content, MATCHES USER DISLIKES.
           - Zero (0): Junk pages per rule #1 above.

        3. CATEGORY - MUST be exactly one of these 8 values:
           "AI & ML", "Business", "Politics", "Technology", "Finance", "Crypto", "Science", "Other"
           NEVER create custom categories. If unsure, use "Other".

        4. TAGS - Only include meaningful topic tags like:
           "machine learning", "startups", "regulations", "cybersecurity", "investing"
           NEVER include: "login", "navigation", "authentication", "menu", "footer", "social media", "facebook", "meta"

        Return STRICT JSON:
        {
            "score": number (0-100),
            "category": string (MUST be one of the 8 categories above),
            "summary": string (1-sentence concise gist, or "[Junk page]" if score=0),
            "entities": string[] (people, companies, products mentioned),
            "tags": string[] (3-5 TOPIC tags only, no platform/UI terms),
            "relevant": boolean (true if score > 50)
        }
        `;

        const response = await sdk.llm.chat([
            { role: 'system', content: 'You are a precise analyzer. Return ONLY valid JSON, no other text.' },
            { role: 'user', content: prompt }
        ], {
            provider,
            model
        });

        // SDK returns response.response?.content based on documentation
        const raw = response.response?.content || '{}';
        return this.parseRobustJSON(raw);
    }

    // For manual signal test from UI
    async analyzeSignal(text: string, settings: AlchemySettings): Promise<AlchemistResponse> {
        return this.analyzeContent(text, 'Manual Text Input', settings);
    }

    async testConnection(settings: AlchemySettings): Promise<{ success: boolean; message: string; model?: string }> {
        try {
            const sdk = SDKService.getSDK();
            if (!sdk) {
                return {
                    success: false,
                    message: 'RealTimeX SDK not available. Please run via RealTimeX Desktop.'
                };
            }

            // Resolve LLM provider dynamically from SDK
            const { provider, model } = await SDKService.resolveChatProvider(settings);

            const response = await sdk.llm.chat([
                { role: 'user', content: 'Say "OK"' }
            ], {
                provider,
                model
            });

            return {
                success: true,
                message: `Connection successful!`,
                model
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'Connection failed'
            };
        }
    }

    private parseRobustJSON(input: string): AlchemistResponse {
        try {
            const jsonMatch = input.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : input;
            const cleaned = jsonStr
                .replace(/<\|[\s\S]*?\|>/g, '')
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();
            const result = JSON.parse(cleaned);
            // Ensure tags exists for backward compatibility if LLM fails to return it
            if (!result.tags) result.tags = result.entities || [];
            return result;
        } catch (e) {
            console.error("JSON Parse Error:", e, input);
            return { score: 0, summary: 'Failed to parse', category: 'Error', entities: [], tags: [], relevant: false };
        }
    }

    /**
     * Process deduplication without generating embedding (Metadata only)
     * Used for low-score signals to merge duplicates based on Title/URL
     */
    private async processDeduplicationOnly(
        signal: Signal,
        settings: AlchemySettings,
        userId: string,
        supabase: SupabaseClient
    ): Promise<void> {
        // Check for duplicates using null embedding (forces metadata check)
        const dedupeResult = await deduplicationService.checkAndMergeDuplicate(
            signal,
            null, // No embedding
            userId,
            supabase,
            settings
        );

        if (dedupeResult.isDuplicate) {
            console.log(`[AlchemistService] Low-score signal is duplicate, merged into: ${dedupeResult.mergedSignalId}`);
            // Delete the newly inserted signal since it's a duplicate
            await supabase
                .from('signals')
                .delete()
                .eq('id', signal.id);
        }
    }

    /**
     * Process embedding generation and deduplication for a signal
     * This runs asynchronously and doesn't block the main mining pipeline
     */
    private async processEmbedding(
        signal: Signal,
        settings: AlchemySettings,
        userId: string,
        supabase: SupabaseClient
    ): Promise<void> {
        try {
            console.log('[AlchemistService] Generating embedding for signal:', signal.id);

            // Resolve embedding provider dynamically
            const { model: embeddingModel } = await SDKService.resolveEmbedProvider(settings);

            // Generate embedding
            const text = `${signal.title} ${signal.summary}`;
            const embedding = await embeddingService.generateEmbedding(text, settings);

            if (!embedding) {
                console.warn('[AlchemistService] Embedding generation returned null, skipping');
                return;
            }

            // Check for duplicates
            const dedupeResult = await deduplicationService.checkAndMergeDuplicate(
                signal,
                embedding,
                userId,
                supabase,
                settings
            );

            if (dedupeResult.isDuplicate) {
                console.log(`[AlchemistService] Signal is duplicate, merged into: ${dedupeResult.mergedSignalId}`);

                // Delete the newly inserted signal since it's a duplicate
                await supabase
                    .from('signals')
                    .delete()
                    .eq('id', signal.id);

                return;
            }

            // Store embedding in Supabase pgvector storage
            await embeddingService.storeSignalEmbedding(
                signal.id!,
                embedding,
                {
                    title: signal.title,
                    summary: signal.summary,
                    url: signal.url,
                    category: signal.category,
                    userId,
                    model: embeddingModel
                },
                supabase
            );

            // Update signal metadata
            await supabase
                .from('signals')
                .update({
                    has_embedding: true,
                    embedding_model: embeddingModel
                })
                .eq('id', signal.id);

            console.log('[AlchemistService] Embedding processed successfully for signal:', signal.id);
        } catch (error: any) {
            console.error('[AlchemistService] Embedding processing error:', error.message);
            // Don't throw - we don't want to fail the entire mining process
        }
    }
}
