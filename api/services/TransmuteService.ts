import { SupabaseClient } from '@supabase/supabase-js';
import { Engine, Asset, Signal, AlchemySettings } from '../lib/types.js';
import { SDKService } from './SDKService.js';
import { embeddingService } from './EmbeddingService.js';

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
        // Default: Top 10 High-Score signals from last 24h matching category
        // TODO: Use filters from engine.config
        const signals = await this.fetchContextSignals(userId, engine.config, supabase);

        if (signals.length === 0) {
            console.warn('[Transmute] No signals found for context');
        }

        // 3. Generate Content (LLM)
        const content = await this.generateAssetContent(engine, signals);

        // 4. Save Asset
        const asset = await this.saveAsset(engine, content, signals, userId, supabase);

        // 5. Update Engine Status
        await supabase
            .from('engines')
            .update({ last_run_at: new Date().toISOString() })
            .eq('id', engineId);

        console.log(`[Transmute] Engine run complete. Asset created: ${asset.id}`);
        return asset;
    }

    /**
     * Fetch relevant signals based on engine configuration
     */
    private async fetchContextSignals(
        userId: string,
        config: any,
        supabase: SupabaseClient
    ): Promise<Signal[]> {
        let query = supabase
            .from('signals')
            .select('*')
            .eq('user_id', userId)
            // .gt('score', config.min_score || 50) 
            .order('score', { ascending: false })
            .limit(10);

        // Apply time range if needed (e.g., last 24h)
        // const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        // query = query.gt('created_at', yesterday);

        if (config.category && config.category !== 'All') {
            query = query.eq('category', config.category);
        }

        const { data } = await query;
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
     * Save the generated asset to DB
     */
    private async saveAsset(
        engine: Engine,
        content: string,
        sourceSignals: Signal[],
        userId: string,
        supabase: SupabaseClient
    ): Promise<Asset> {
        const { data, error } = await supabase
            .from('assets')
            .insert({
                user_id: userId,
                engine_id: engine.id,
                title: `${engine.title} - ${new Date().toLocaleDateString()}`,
                type: 'markdown', // Default to markdown for now
                content: content,
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
