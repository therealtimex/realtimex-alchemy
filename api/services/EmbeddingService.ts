import { AlchemySettings } from '../lib/types.js';

/**
 * Embedding Service using RealTimeX SDK
 * Provides simplified interface for embedding generation and vector operations
 * Gracefully degrades if SDK is not available
 */
export class EmbeddingService {
    private readonly WORKSPACE_ID = 'alchemy-signals';
    private readonly SIMILARITY_THRESHOLD = 0.85;
    private sdk: any = null;
    private sdkLoadAttempted = false;

    /**
     * Lazy load SDK - only loads when first needed
     */
    private async loadSDK() {
        if (this.sdkLoadAttempted) {
            return this.sdk;
        }

        this.sdkLoadAttempted = true;

        try {
            const sdkModule = await import('../lib/realtimex-sdk.js');
            this.sdk = sdkModule.realtimeXSDK;
            console.log('[EmbeddingService] RealTimeX SDK loaded successfully');
        } catch (error) {
            console.warn('[EmbeddingService] RealTimeX SDK not available - embedding features disabled');
            this.sdk = null;
        }

        return this.sdk;
    }

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
            const sdk = await this.loadSDK();
            if (!sdk || !sdk.isConfigured()) {
                console.warn('[EmbeddingService] RealTimeX SDK not available');
                return null;
            }

            const provider = this.getProvider(settings);
            const model = settings.embedding_model || 'text-embedding-3-small';

            const embeddings = await sdk.generateEmbedding(
                text,
                provider,
                model
            );

            return embeddings[0] || null;
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
            const sdk = await this.loadSDK();
            if (!sdk || !sdk.isConfigured()) {
                console.warn('[EmbeddingService] RealTimeX SDK not configured');
                return null;
            }

            const provider = this.getProvider(settings);
            const model = settings.embedding_model || 'text-embedding-3-small';

            return await sdk.generateEmbedding(texts, provider, model);
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
            const sdk = await this.loadSDK();
            if (!sdk) {
                throw new Error('SDK not available');
            }

            await sdk.upsertVectors(
                [{
                    id: signalId,
                    vector: embedding,
                    metadata
                }],
                this.WORKSPACE_ID
            );

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
            const sdk = await this.loadSDK();
            if (!sdk) {
                return [];
            }

            const results = await sdk.queryVectors(
                queryEmbedding,
                limit,
                this.WORKSPACE_ID,
                { userId } // Filter by user
            );

            // Filter by similarity threshold
            return results.filter((r: any) => r.score >= threshold);
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
        // If embedding_base_url is not set, use realtimexai (default)
        if (!settings.embedding_base_url) {
            return 'realtimexai';
        }

        // Detect provider from base URL
        const url = settings.embedding_base_url.toLowerCase();

        if (url.includes('openai')) {
            return 'openai';
        } else if (url.includes('google') || url.includes('gemini')) {
            return 'gemini';
        }

        // Default to realtimexai
        return 'realtimexai';
    }

    /**
     * Check if embedding service is available
     * @returns True if SDK is configured and available
     */
    async isAvailable(): Promise<boolean> {
        const sdk = await this.loadSDK();
        return sdk !== null && sdk.isConfigured();
    }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();
