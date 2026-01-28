import { AlchemySettings } from '../lib/types.js';
import { SDKService } from './SDKService.js';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Embedding Service
 * Uses RealTimeX SDK for embedding generation
 * Uses Supabase pgvector for vector storage and similarity search
 * Gracefully degrades if SDK is not available
 */
export class EmbeddingService {
    private readonly SIMILARITY_THRESHOLD = 0.85;

    /**
     * Generate embedding for a single text
     * @param text - Text to embed
     * @param settings - Alchemy settings with embedding configuration
     * @returns Embedding vector or null if failed
     */
    async generateEmbedding(
        text: string,
        settings: AlchemySettings
    ): Promise<number[] | null> {
        try {
            const sdk = SDKService.getSDK();
            if (!sdk) {
                console.warn('[EmbeddingService] RealTimeX SDK not available');
                return null;
            }

            const provider = this.getProvider(settings);
            const model = settings.embedding_model || 'text-embedding-3-small';

            const response = await sdk.llm.embed(text, {
                provider,
                model
            });

            return response.embeddings?.[0] || null;
        } catch (error: any) {
            console.error('[EmbeddingService] Generation failed:', error.message);
            return null;
        }
    }

    /**
     * Generate embeddings for multiple texts (batch)
     * @param texts - Array of texts to embed
     * @param settings - Alchemy settings
     * @returns Array of embedding vectors or null if failed
     */
    async generateEmbeddings(
        texts: string[],
        settings: AlchemySettings
    ): Promise<number[][] | null> {
        try {
            const sdk = SDKService.getSDK();
            if (!sdk) {
                console.warn('[EmbeddingService] RealTimeX SDK not available');
                return null;
            }

            const provider = this.getProvider(settings);
            const model = settings.embedding_model || 'text-embedding-3-small';

            const response = await sdk.llm.embed(texts, {
                provider,
                model
            });

            return response.embeddings || null;
        } catch (error: any) {
            console.error('[EmbeddingService] Batch generation failed:', error.message);
            return null;
        }
    }

    /**
     * Store signal embedding in Supabase pgvector storage
     * @param signalId - Unique signal ID
     * @param embedding - Embedding vector
     * @param metadata - Signal metadata
     * @param supabase - Supabase client
     */
    async storeSignalEmbedding(
        signalId: string,
        embedding: number[],
        metadata: {
            title: string;
            summary: string;
            url: string;
            category?: string;
            userId: string;
        },
        supabase: SupabaseClient
    ): Promise<void> {
        try {
            // Format embedding as pgvector string
            const embeddingStr = `[${embedding.join(',')}]`;

            const { error } = await supabase
                .from('alchemy_vectors')
                .upsert({
                    signal_id: signalId,
                    user_id: metadata.userId,
                    embedding: embeddingStr,
                    model: 'text-embedding-3-small'
                }, {
                    onConflict: 'signal_id,model'
                });

            if (error) {
                throw error;
            }

            console.log('[EmbeddingService] Stored embedding for signal:', signalId);
        } catch (error: any) {
            console.error('[EmbeddingService] Storage failed:', error.message);
            throw error;
        }
    }

    /**
     * Find similar signals using semantic search via Supabase pgvector
     * @param queryEmbedding - Query embedding vector
     * @param userId - User ID for filtering
     * @param supabase - Supabase client
     * @param threshold - Similarity threshold (0-1)
     * @param limit - Max results
     * @returns Array of similar signals
     */
    async findSimilarSignals(
        queryEmbedding: number[],
        userId: string,
        supabase: SupabaseClient,
        threshold: number = this.SIMILARITY_THRESHOLD,
        limit: number = 10
    ): Promise<Array<{ id: string; score: number; metadata: any }>> {
        try {
            // Format embedding as pgvector string
            const embeddingStr = `[${queryEmbedding.join(',')}]`;

            const { data, error } = await supabase.rpc('match_vectors', {
                query_embedding: embeddingStr,
                match_threshold: threshold,
                match_count: limit,
                target_user_id: userId
            });

            if (error) {
                console.error('[EmbeddingService] Similarity search RPC error:', error.message);
                return [];
            }

            // Map results to expected format
            return (data || []).map((r: any) => ({
                id: r.signal_id,
                score: r.similarity,
                metadata: {
                    title: r.title,
                    summary: r.summary,
                    url: r.url,
                    category: r.category,
                    userId
                }
            }));
        } catch (error: any) {
            console.error('[EmbeddingService] Similarity search failed:', error.message);
            return [];
        }
    }

    /**
     * Delete all embeddings for a user
     * @param userId - User ID
     * @param supabase - Supabase client
     */
    async deleteUserEmbeddings(userId: string, supabase: SupabaseClient): Promise<void> {
        try {
            const { error } = await supabase
                .from('alchemy_vectors')
                .delete()
                .eq('user_id', userId);

            if (error) {
                throw error;
            }

            console.log('[EmbeddingService] Deleted all embeddings for user:', userId);
        } catch (error: any) {
            console.error('[EmbeddingService] Deletion failed:', error.message);
            throw error;
        }
    }

    /**
     * Determine provider from settings
     * @param settings - Alchemy settings
     * @returns Provider name
     */
    private getProvider(settings: AlchemySettings): string {
        // Use embedding_provider if set
        if (settings.embedding_provider) {
            return settings.embedding_provider;
        }

        // Fallback: detect from base URL (legacy)
        if (settings.embedding_base_url) {
            const url = settings.embedding_base_url.toLowerCase();
            if (url.includes('openai')) return 'openai';
            if (url.includes('google') || url.includes('gemini')) return 'gemini';
        }

        // Default to realtimexai
        return 'realtimexai';
    }

    /**
     * Check if embedding service is available
     * @returns True if SDK is configured and available
     */
    async isAvailable(): Promise<boolean> {
        return await SDKService.isAvailable();
    }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();
