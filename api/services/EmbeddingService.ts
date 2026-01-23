import { AlchemySettings } from '../lib/types.js';
import { SDKService } from './SDKService.js';

/**
 * Embedding Service using RealTimeX SDK
 * Provides simplified interface for embedding generation and vector operations
 * Gracefully degrades if SDK is not available
 */
export class EmbeddingService {
    private readonly WORKSPACE_ID = 'alchemy-signals';
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
     * Store signal embedding in RealTimeX vector storage
     * @param signalId - Unique signal ID
     * @param embedding - Embedding vector
     * @param metadata - Signal metadata
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
        }
    ): Promise<void> {
        try {
            const sdk = SDKService.getSDK();
            if (!sdk) {
                throw new Error('SDK not available');
            }

            await sdk.llm.vectors.upsert([{
                id: signalId,
                vector: embedding,
                metadata
            }], { workspaceId: this.WORKSPACE_ID });

            console.log('[EmbeddingService] Stored embedding for signal:', signalId);
        } catch (error: any) {
            console.error('[EmbeddingService] Storage failed:', error.message);
            throw error;
        }
    }

    /**
     * Find similar signals using semantic search
     * @param queryEmbedding - Query embedding vector
     * @param userId - User ID for filtering
     * @param threshold - Similarity threshold (0-1)
     * @param limit - Max results
     * @returns Array of similar signals
     */
    async findSimilarSignals(
        queryEmbedding: number[],
        userId: string,
        threshold: number = this.SIMILARITY_THRESHOLD,
        limit: number = 10
    ): Promise<Array<{ id: string; score: number; metadata: any }>> {
        try {
            const sdk = SDKService.getSDK();
            if (!sdk) {
                return [];
            }

            const response = await sdk.llm.vectors.query(queryEmbedding, {
                topK: limit,
                workspaceId: this.WORKSPACE_ID
            });

            // Filter by similarity threshold and user
            const results = response.results || [];
            return results
                .filter((r: any) => r.metadata?.userId === userId)
                .filter((r: any) => r.score >= threshold)
                .map((r: any) => ({
                    id: r.id,
                    score: r.score,
                    metadata: r.metadata || {}
                }));
        } catch (error: any) {
            console.error('[EmbeddingService] Similarity search failed:', error.message);
            return [];
        }
    }

    /**
     * Delete all embeddings for a user
     * @param userId - User ID
     */
    async deleteUserEmbeddings(userId: string): Promise<void> {
        try {
            // Note: Current SDK only supports deleteAll
            // In future, we may need user-specific workspaces
            console.warn('[EmbeddingService] User-specific deletion not yet supported');
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
