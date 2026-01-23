import { embeddingService } from './EmbeddingService.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { Signal } from '../lib/types.js';

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
        embedding: number[],
        userId: string,
        supabase: SupabaseClient
    ): Promise<{
        isDuplicate: boolean;
        mergedSignalId?: string;
        similarityScore?: number;
    }> {
        try {
            // Find similar signals
            const similar = await embeddingService.findSimilarSignals(
                embedding,
                userId,
                this.SIMILARITY_THRESHOLD,
                5 // Check top 5 matches
            );

            if (similar.length === 0) {
                return { isDuplicate: false };
            }

            // Get the most similar signal
            const bestMatch = similar[0];

            console.log(`[Deduplication] Found similar signal: ${bestMatch.id} (score: ${bestMatch.score})`);

            // Merge signals
            const mergedId = await this.mergeSignals(
                bestMatch.id,
                signal,
                userId,
                supabase
            );

            return {
                isDuplicate: true,
                mergedSignalId: mergedId,
                similarityScore: bestMatch.score
            };
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
        supabase: SupabaseClient
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
        const scoreBoost = Math.min(mentionCount * 0.1, 0.5); // Max 50% boost
        const newScore = Math.min(existing.score + scoreBoost, 10); // Cap at 10

        // Combine summaries (use longer one)
        const combinedSummary = this.combineSummaries(
            existing.summary,
            newSignal.summary
        );

        // Track source URLs in metadata
        const existingUrls = existing.metadata?.source_urls || [existing.url];
        const sourceUrls = [...new Set([...existingUrls, newSignal.url])]; // Deduplicate URLs

        // Update existing signal
        const { error: updateError } = await supabase
            .from('signals')
            .update({
                score: newScore,
                summary: combinedSummary,
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
     * Combine two summaries intelligently
     * @param existing - Existing summary
     * @param newSummary - New summary
     * @returns Combined summary
     */
    private combineSummaries(existing: string, newSummary: string): string {
        // Simple strategy: use the longer summary
        // TODO: In future, use LLM to intelligently merge summaries
        if (existing.length >= newSummary.length) {
            return existing;
        }
        return newSummary;
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
