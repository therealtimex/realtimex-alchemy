import OpenAI from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';
import { HistoryEntry } from '../lib/types.js';
import { ProcessingEventService } from './ProcessingEventService.js';
import { RouterService } from './RouterService.js';

export interface AlchemistResponse {
    score: number;
    summary: string;
    category: string;
    entities: string[];
    tags: string[];
    relevant: boolean;
}



export interface AlchemistConfig {
    baseUrl: string;
    model: string;
    apiKey?: string;
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

        // Initialize OpenAI client with user settings
        const config: AlchemistConfig = {
            baseUrl: settings.llm_base_url || 'http://localhost:11434',
            model: settings.llm_model_name || 'llama3',
            apiKey: settings.llm_api_key || 'ollama'
        };

        console.log('[AlchemistService] LLM Config:', {
            baseUrl: config.baseUrl,
            model: config.model,
            hasApiKey: !!config.apiKey
        });

        const client = new OpenAI({
            baseURL: config.baseUrl.endsWith('/v1') ? config.baseUrl : `${config.baseUrl}/v1`,
            apiKey: config.apiKey,
            dangerouslyAllowBrowser: true
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
                const response = await this.analyzeContent(client, content, entry.url, config.model);

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
                    const { error: insertError } = await supabase.from('signals').insert([{
                        user_id: userId,
                        url: entry.url,
                        title: entry.title,
                        score: response.score,
                        summary: response.summary,
                        category: response.category,
                        entities: response.entities,
                        tags: response.tags,
                        content: content
                    }]);

                    if (insertError) {
                        console.error('[AlchemistService] Insert error:', insertError);
                        stats.errors++;
                    } else {
                        console.log('[AlchemistService] Signal saved successfully');
                        stats.signals++;
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

    private async analyzeContent(client: OpenAI, content: string, url: string, model: string): Promise<AlchemistResponse> {
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

        const completion = await client.chat.completions.create({
            model: model,
            messages: [
                { role: 'system', content: 'You are a precise analyzer. Return ONLY valid JSON, no other text.' },
                { role: 'user', content: prompt }
            ]
            // Note: response_format removed for compatibility with LM Studio and other local LLMs
        });

        const raw = completion.choices[0].message.content || '{}';
        return this.parseRobustJSON(raw);
    }

    // For manual signal test from UI
    async analyzeSignal(text: string, config: AlchemistConfig): Promise<AlchemistResponse> {
        const client = new OpenAI({
            baseURL: config.baseUrl.endsWith('/v1') ? config.baseUrl : `${config.baseUrl}/v1`,
            apiKey: config.apiKey || 'ollama',
            dangerouslyAllowBrowser: true
        });

        return this.analyzeContent(client, text, 'Manual Text Input', config.model);
    }

    async testConnection(config: AlchemistConfig): Promise<{ success: boolean; message: string; model?: string }> {
        try {
            const client = new OpenAI({
                apiKey: config.apiKey || 'ollama',
                baseURL: config.baseUrl.endsWith('/v1') ? config.baseUrl : `${config.baseUrl}/v1`
            });

            const completion = await client.chat.completions.create({
                messages: [{ role: 'user', content: 'Say "OK"' }],
                model: config.model,
                max_tokens: 5
            });

            return {
                success: true,
                message: `Connection successful!`,
                model: config.model
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
}
