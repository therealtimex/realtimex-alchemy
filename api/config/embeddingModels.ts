/**
 * Embedding Model Dimension Configuration (Reference)
 *
 * NOTE: Dimensions are derived from actual embedding vectors at runtime.
 * This file serves as documentation and for optional pre-validation.
 *
 * pgvector HNSW index has 2000 dimension limit.
 * Models with >2000 dimensions (e.g., text-embedding-3-large) use sequential scan.
 */

export const EMBEDDING_DIMENSIONS: Record<string, number> = {
    // OpenAI models
    'text-embedding-3-small': 1536,
    'text-embedding-3-large': 3072,
    'text-embedding-ada-002': 1536,

    // Anthropic (if/when available)
    // 'voyage-large-2': 1024,

    // Ollama common models
    'nomic-embed-text': 768,
    'mxbai-embed-large': 1024,
    'all-minilm': 384,
    'bge-large': 1024,

    // Add more models as needed
};

/** pgvector HNSW index dimension limit */
export const HNSW_MAX_DIMENSIONS = 2000;

/**
 * Get the dimension count for a given embedding model
 * @param model - Model name
 * @returns Dimension count (defaults to 1536 for unknown models)
 */
export function getDimensions(model: string): number {
    return EMBEDDING_DIMENSIONS[model] ?? 1536;
}

/**
 * Check if a model is supported (has known dimensions)
 * @param model - Model name
 * @returns True if model has known dimensions
 */
export function isKnownModel(model: string): boolean {
    return model in EMBEDDING_DIMENSIONS;
}
