import axios, { AxiosInstance } from 'axios';

/**
 * RealTimeX SDK Client
 * Provides access to RealTimeX Desktop APIs for LLM, embeddings, and vector storage
 */
export class RealTimeXSDK {
    private client: AxiosInstance;
    private appId: string;
    private baseUrl: string;

    constructor(baseUrl: string = 'http://localhost:3001') {
        this.baseUrl = baseUrl;
        // RTX_APP_ID is injected by RealTimeX when starting the app
        this.appId = process.env.RTX_APP_ID || '';

        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'X-App-Id': this.appId,
                'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
        });
    }

    /**
     * Generate embeddings for text inputs
     * @param input - Single string or array of strings to embed
     * @param provider - Provider name (realtimexai, openai, gemini)
     * @param model - Model name (e.g., text-embedding-3-small)
     * @returns Array of embedding vectors
     */
    async generateEmbedding(
        input: string | string[],
        provider: string = 'realtimexai',
        model: string = 'text-embedding-3-small'
    ): Promise<number[][]> {
        try {
            const response = await this.client.post('/sdk/llm/embed', {
                input: Array.isArray(input) ? input : [input],
                provider,
                model
            });

            if (!response.data.success) {
                throw new Error(response.data.error || 'Embedding generation failed');
            }

            return response.data.embeddings;
        } catch (error: any) {
            console.error('[RealTimeXSDK] Embedding error:', error.message);
            throw error;
        }
    }

    /**
     * Store vectors in RealTimeX managed vector storage
     * @param vectors - Array of vectors with metadata
     * @param workspaceId - Workspace/namespace for isolation
     */
    async upsertVectors(
        vectors: Array<{
            id: string;
            vector: number[];
            metadata: Record<string, any>;
        }>,
        workspaceId: string = 'default'
    ): Promise<void> {
        try {
            const response = await this.client.post('/sdk/llm/vectors/upsert', {
                vectors,
                workspaceId
            });

            if (!response.data.success) {
                throw new Error(response.data.error || 'Vector upsert failed');
            }
        } catch (error: any) {
            console.error('[RealTimeXSDK] Vector upsert error:', error.message);
            throw error;
        }
    }

    /**
     * Query vectors for semantic similarity search
     * @param queryVector - Query embedding vector
     * @param topK - Number of results to return
     * @param workspaceId - Workspace/namespace to search in
     * @param filter - Optional metadata filter
     * @returns Array of similar vectors with scores
     */
    async queryVectors(
        queryVector: number[],
        topK: number = 10,
        workspaceId: string = 'default',
        filter?: Record<string, any>
    ): Promise<Array<{ id: string; score: number; metadata: any }>> {
        try {
            const response = await this.client.post('/sdk/llm/vectors/query', {
                vector: queryVector,
                topK,
                workspaceId,
                filter
            });

            if (!response.data.success) {
                throw new Error(response.data.error || 'Vector query failed');
            }

            return response.data.results || [];
        } catch (error: any) {
            console.error('[RealTimeXSDK] Vector query error:', error.message);
            throw error;
        }
    }

    /**
     * Delete vectors from storage
     * @param workspaceId - Workspace to delete from
     * @param deleteAll - If true, deletes all vectors in workspace
     */
    async deleteVectors(
        workspaceId: string,
        deleteAll: boolean = false
    ): Promise<void> {
        try {
            const response = await this.client.post('/sdk/llm/vectors/delete', {
                workspaceId,
                deleteAll
            });

            if (!response.data.success) {
                throw new Error(response.data.error || 'Vector deletion failed');
            }
        } catch (error: any) {
            console.error('[RealTimeXSDK] Vector delete error:', error.message);
            throw error;
        }
    }

    /**
     * List available LLM and embedding providers
     * @returns Provider configuration
     */
    async getProviders(): Promise<any> {
        try {
            const response = await this.client.get('/sdk/llm/providers');

            if (!response.data.success) {
                throw new Error(response.data.error || 'Failed to fetch providers');
            }

            return response.data;
        } catch (error: any) {
            console.error('[RealTimeXSDK] Get providers error:', error.message);
            throw error;
        }
    }

    /**
     * List all vector storage workspaces
     * @returns Array of workspace IDs
     */
    async listVectorWorkspaces(): Promise<string[]> {
        try {
            const response = await this.client.get('/sdk/llm/vectors/workspaces');

            if (!response.data.success) {
                throw new Error(response.data.error || 'Failed to list workspaces');
            }

            return response.data.workspaces || [];
        } catch (error: any) {
            console.error('[RealTimeXSDK] List workspaces error:', error.message);
            throw error;
        }
    }

    /**
     * Check if SDK is properly configured
     * @returns True if app ID is set
     */
    isConfigured(): boolean {
        return !!this.appId;
    }

    /**
     * Get current app ID
     * @returns App ID or empty string
     */
    getAppId(): string {
        return this.appId;
    }
}

// Export singleton instance
export const realtimeXSDK = new RealTimeXSDK();
