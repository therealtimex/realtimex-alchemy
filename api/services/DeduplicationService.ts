import { embeddingService } from './EmbeddingService.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { Signal, AlchemySettings } from '../lib/types.js';
import { SDKService } from './SDKService.js';

/**
 * Deduplication Service
 * Handles smart signal merging based on semantic similarity
 */
export class DeduplicationService {
    private readonly SIMILARITY_THRESHOLD = 0.85;

    /**
     * Check if signal is a duplicate and merge if necessary
     * @param signal - New signal to check
     * @param embedding - Signal embedding vector
     * @param userId - User ID
     * @param supabase - Supabase client
     * @returns Deduplication result
     */
    async checkAndMergeDuplicate(
        signal: Signal,
        embedding: number[] | null,
        userId: string,
        supabase: SupabaseClient,
        settings: AlchemySettings
    ): Promise<{
        isDuplicate: boolean;
        mergedSignalId?: string;
        similarityScore?: number;
    }> {
        try {
            // 1. Semantic Check (if embedding exists)
            if (embedding && embedding.length > 0) {
                const similar = await embeddingService.findSimilarSignals(
                    embedding,
                    userId,
                    this.SIMILARITY_THRESHOLD,
                    5 // Check top 5 matches
                );

                if (similar.length > 0) {
                    const bestMatch = similar[0];
                    console.log(`[Deduplication] Found semantic duplicate: ${bestMatch.id} (score: ${bestMatch.score})`);

                    const mergedId = await this.mergeSignals(bestMatch.id, signal, userId, supabase, settings);
                    return { isDuplicate: true, mergedSignalId: mergedId, similarityScore: bestMatch.score };
                }
            }

            // 2. Title Match Check (Metadata Heuristic)
            // Useful for redirected URLs or tracking links where content is same but URL differs
            if (signal.title && signal.title.length > 10) {
                // Normalize title by trimming and collapsing whitespace
                const normalizedTitle = signal.title.trim().replace(/\s+/g, ' ');

                const { data: titleMatch } = await supabase
                    .from('signals')
                    .select('id, score, title')
                    .eq('user_id', userId)
                    .ilike('title', normalizedTitle) // Case-insensitive match
                    .neq('id', signal.id || '00000000-0000-0000-0000-000000000000') // Don't match self
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (titleMatch) {
                    console.log(`[Deduplication] Found title match: ${titleMatch.id} ("${titleMatch.title}")`);
                    const mergedId = await this.mergeSignals(titleMatch.id, signal, userId, supabase, settings);
                    return { isDuplicate: true, mergedSignalId: mergedId, similarityScore: 0.95 }; // High confidence
                }
            }

            // 3. Exact URL Check (Fallback for signals without embeddings)
            // Even if semantic check failed (or skipped), we shouldn't save the exact same URL twice.
            const { data: existingUrlMatch } = await supabase
                .from('signals')
                .select('id, score')
                .eq('user_id', userId)
                .eq('url', signal.url)
                .neq('id', signal.id || '00000000-0000-0000-0000-000000000000') // Don't match self
                .maybeSingle();

            if (existingUrlMatch) {
                console.log(`[Deduplication] Found exact URL match: ${existingUrlMatch.id}`);
                const mergedId = await this.mergeSignals(existingUrlMatch.id, signal, userId, supabase, settings);
                return { isDuplicate: true, mergedSignalId: mergedId, similarityScore: 1.0 };
            }

            return { isDuplicate: false };
        } catch (error: any) {
            console.error('[Deduplication] Error:', error.message);
            return { isDuplicate: false };
        }
    }

    /**
     * Merge new signal into existing signal
     * @param existingSignalId - ID of existing signal
     * @param newSignal - New signal to merge
     * @param userId - User ID
     * @param supabase - Supabase client
     * @returns Merged signal ID
     */
    private async mergeSignals(
        existingSignalId: string,
        newSignal: Signal,
        userId: string,
        supabase: SupabaseClient,
        settings: AlchemySettings
    ): Promise<string> {
        // Fetch existing signal
        const { data: existing, error } = await supabase
            .from('signals')
            .select('*')
            .eq('id', existingSignalId)
            .eq('user_id', userId)
            .single();

        if (error || !existing) {
            console.error('[Deduplication] Failed to fetch existing signal:', error);
            return existingSignalId;
        }

        // Calculate boosted score
        const mentionCount = (existing.mention_count || 1) + 1;
        // SIGNIFICANT FIX: Scale boost for 0-100 scale (was capped at 10)
        const scoreBoost = Math.min(mentionCount * 2, 20);
        const newScore = Math.min(Math.max(existing.score, newSignal.score) + scoreBoost, 100);

        // Combine summaries using LLM
        const combinedSummary = await this.combineSummaries(
            existing.summary,
            newSignal.summary,
            settings
        );

        // Merge Entities and Tags (NEW: Prevent data loss)
        const combinedEntities = [...new Set([...(existing.entities || []), ...(newSignal.entities || [])])];
        const combinedTags = [...new Set([...(existing.tags || []), ...(newSignal.tags || [])])];

        // Track source URLs in metadata
        const existingUrls = existing.metadata?.source_urls || [existing.url];
        const sourceUrls = [...new Set([...existingUrls, newSignal.url])]; // Deduplicate URLs

        // URL Promotion: If new signal has a 'better' URL (longer and doesn't look masked), promote it
        let promotedUrl = existing.url;
        const isExistingMasked = existing.url.includes('t.co') || existing.url.length < 25;
        const isNewBetter = !newSignal.url.includes('t.co') && newSignal.url.length > 25;

        if (isExistingMasked && isNewBetter) {
            console.log(`[Deduplication] Promoting new direct URL: ${newSignal.url} over masked: ${existing.url}`);
            promotedUrl = newSignal.url;
        }

        // Update existing signal
        const { error: updateError } = await supabase
            .from('signals')
            .update({
                url: promotedUrl,
                score: newScore,
                summary: combinedSummary,
                entities: combinedEntities, // Merge entities
                tags: combinedTags,         // Merge tags
                mention_count: mentionCount,
                metadata: {
                    ...existing.metadata,
                    source_urls: sourceUrls,
                    last_seen: new Date().toISOString(),
                    duplicate_count: mentionCount - 1
                },
                updated_at: new Date().toISOString()
            })
            .eq('id', existingSignalId);

        if (updateError) {
            console.error('[Deduplication] Failed to update signal:', updateError);
        } else {
            console.log(`[Deduplication] Merged signal ${newSignal.id} into ${existingSignalId} (mentions: ${mentionCount}, score: ${newScore})`);
        }

        return existingSignalId;
    }

    /**
     * Combine two summaries intelligently using LLM
     * @param existing - Existing summary
     * @param newSummary - New summary
     * @param settings - Alchemy settings for LLM
     * @returns Combined summary
     */
    private async combineSummaries(
        existing: string,
        newSummary: string,
        settings: AlchemySettings
    ): Promise<string> {
        // If summaries are very similar, just use existing
        if (existing === newSummary) {
            return existing;
        }

        try {
            const sdk = SDKService.getSDK();
            if (!sdk) {
                // Fallback: use longer summary
                return existing.length >= newSummary.length ? existing : newSummary;
            }

            // Use LLM to intelligently merge summaries
            const response = await sdk.llm.chat([
                {
                    role: 'system',
                    content: 'You are a summary merger. Combine two summaries into one concise summary that captures all key information. Return ONLY the merged summary, no other text.'
                },
                {
                    role: 'user',
                    content: `Summary 1: ${existing}\nSummary 2: ${newSummary}\n\nMerged summary:`
                }
            ], {
                provider: settings.llm_provider || 'realtimexai',
                model: settings.llm_model || 'gpt-4o-mini'
            });

            const merged = response.response?.content?.trim();
            return merged || existing;
        } catch (error: any) {
            console.error('[Deduplication] Summary merging failed:', error.message);
            // Fallback: use longer summary
            return existing.length >= newSummary.length ? existing : newSummary;
        }
    }

    /**
     * Get deduplication statistics for a user
     * @param userId - User ID
     * @param supabase - Supabase client
     * @returns Statistics object
     */
    async getStats(
        userId: string,
        supabase: SupabaseClient
    ): Promise<{
        totalSignals: number;
        mergedSignals: number;
        deduplicationRate: number;
    }> {
        try {
            // Count total signals
            const { count: totalSignals } = await supabase
                .from('signals')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            // Count merged signals (mention_count > 1)
            const { count: mergedSignals } = await supabase
                .from('signals')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .gt('mention_count', 1);

            const deduplicationRate = totalSignals
                ? (mergedSignals || 0) / totalSignals
                : 0;

            return {
                totalSignals: totalSignals || 0,
                mergedSignals: mergedSignals || 0,
                deduplicationRate
            };
        } catch (error: any) {
            console.error('[Deduplication] Failed to get stats:', error.message);
            return {
                totalSignals: 0,
                mergedSignals: 0,
                deduplicationRate: 0
            };
        }
    }
}

// Export singleton instance
export const deduplicationService = new DeduplicationService();
