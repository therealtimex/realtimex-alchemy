import { SupabaseClient } from '@supabase/supabase-js';
import { HistoryEntry, Signal, AlchemySettings } from '../lib/types.js';
import { ProcessingEventService } from './ProcessingEventService.js';
import { RouterService } from './RouterService.js';
import { embeddingService } from './EmbeddingService.js';
import { deduplicationService } from './DeduplicationService.js';
import { SDKService } from './SDKService.js';

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

        // Track stats for completion event
        const stats = {
            total: entries.length,
            signals: 0,
            skipped: 0,
            errors: 0
        };

        console.log('[AlchemistService] LLM Config:', {
            provider: settings.llm_provider || 'realtimexai',
            model: settings.llm_model || 'gpt-4o'
        });

        for (const entry of entries) {
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
                try {
                    const markdown = await this.router.extractContent(entry.url);
                    if (markdown && markdown.length > 100) {
                        // Truncate to avoid token limits (keep ~8000 chars)
                        const truncated = markdown.length > 8000 ? markdown.substring(0, 8000) + '...' : markdown;
                        content = `Page Title: ${entry.title}\nContent: ${truncated}`;
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
                const response = await this.analyzeContent(content, entry.url, settings);

                const duration = Date.now() - startAnalysis;

                if (response.relevant) {
                    // Emit: Signal Found
                    await this.processingEvents.log({
                        eventType: 'action',
                        agentState: 'Signal',
                        message: `Found signal: ${response.summary} (${response.score}%)`,
                        level: 'info',
                        metadata: response,
                        durationMs: duration,
                        userId
                    }, supabase);

                    // 4. Save Signal
                    console.log('[AlchemistService] Saving signal to database...');
                    const { data: insertedSignal, error: insertError } = await supabase
                        .from('signals')
                        .insert([{
                            user_id: userId,
                            url: entry.url,
                            title: entry.title,
                            score: response.score,
                            summary: response.summary,
                            category: response.category,
                            entities: response.entities,
                            tags: response.tags,
                            content: content
                        }])
                        .select()
                        .single();

                    if (insertError) {
                        console.error('[AlchemistService] Insert error:', insertError);
                        stats.errors++;
                    } else {
                        console.log('[AlchemistService] Signal saved successfully');
                        stats.signals++;

                        // 5. Generate Embedding & Check for Duplicates (non-blocking)
                        if (settings.embedding_model && await embeddingService.isAvailable()) {
                            this.processEmbedding(insertedSignal, settings, userId, supabase).catch((err: any) => {
                                console.error('[AlchemistService] Embedding processing failed:', err);
                            });
                        }
                    }
                } else {
                    // Emit: Skipped
                    await this.processingEvents.log({
                        eventType: 'info',
                        agentState: 'Skipped',
                        message: `Irrelevant content (${response.score}%): ${entry.title}`,
                        level: 'debug',
                        durationMs: duration,
                        userId
                    }, supabase);
                    stats.skipped++;
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
    }

    private async analyzeContent(content: string, url: string, settings: AlchemySettings): Promise<AlchemistResponse> {
        const sdk = SDKService.getSDK();
        if (!sdk) {
            throw new Error('RealTimeX SDK not available');
        }

        const prompt = `
        Act as "The Alchemist", a high-level intelligence analyst.
        Analyze the following article value.
        
        Input:
        URL: ${url}
        Content: ${content}
        
        CRITICAL SCORING: 
        High Score (80-100): Original research, concrete data points, contrarian insights, deep technical details, official documentation.
        Medium Score (50-79): Decent summaries, useful aggregate news, tutorials, reference material, software documentation.
        Low Score (0-49): Marketing fluff, SEO clickbait, generic listicles, navigation menus only, login pages, or site footers.
        
        Return STRICT JSON:
        {
            "score": number (0-100),
            "category": string (one of: AI & ML, Business, Politics, Technology, Finance, Crypto, Science, Other),
            "summary": string (1-sentence concise gist),
            "entities": string[],
            "tags": string[] (3-5 relevant topic tags for categorization),
            "relevant": boolean (true if score > 50)
        }
        `;

        const response = await sdk.llm.chat([
            { role: 'system', content: 'You are a precise analyzer. Return ONLY valid JSON, no other text.' },
            { role: 'user', content: prompt }
        ], {
            provider: settings.llm_provider || 'realtimexai',
            model: settings.llm_model || 'gpt-4o'
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

            const response = await sdk.llm.chat([
                { role: 'user', content: 'Say "OK"' }
            ], {
                provider: settings.llm_provider || 'realtimexai',
                model: settings.llm_model || 'gpt-4o'
            });

            return {
                success: true,
                message: `Connection successful!`,
                model: settings.llm_model || 'gpt-4o'
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

            // Store embedding in RealTimeX vector storage
            await embeddingService.storeSignalEmbedding(
                signal.id!,
                embedding,
                {
                    title: signal.title,
                    summary: signal.summary,
                    url: signal.url,
                    category: signal.category,
                    userId
                }
            );

            // Update signal metadata
            await supabase
                .from('signals')
                .update({
                    has_embedding: true,
                    embedding_model: settings.embedding_model
                })
                .eq('id', signal.id);

            console.log('[AlchemistService] Embedding processed successfully for signal:', signal.id);
        } catch (error: any) {
            console.error('[AlchemistService] Embedding processing error:', error.message);
            // Don't throw - we don't want to fail the entire mining process
        }
    }
}
