-- Variable Dimension Embedding Support Migration
-- Enables agnostic model switching by supporting multiple embedding dimensions
-- Strategy: Partial indexes per dimension + explicit casting in queries

-- 1. Drop existing HNSW index (requires fixed dimension)
DROP INDEX IF EXISTS idx_vectors_embedding;

-- Drop old match_vectors functions (different signatures exist from previous migrations)
DROP FUNCTION IF EXISTS match_vectors(vector(1536), FLOAT, INT, UUID);
DROP FUNCTION IF EXISTS match_vectors(vector(1536), TEXT, FLOAT, INT, UUID);

-- 2. Change to variable dimension vector (remove fixed dimension constraint)
-- This allows storing embeddings of any dimension
ALTER TABLE alchemy_vectors
ALTER COLUMN embedding TYPE vector;

-- 3. Create partial indexes per dimension (common models)
-- These indexes are used when queries explicitly cast to the matching dimension
-- NOTE: pgvector HNSW has 2000 dimension limit; larger dimensions use sequential scan

-- 384 dimensions (all-minilm)
CREATE INDEX idx_vectors_embed_384 ON alchemy_vectors
    USING hnsw ((embedding::vector(384)) vector_cosine_ops)
    WHERE array_length(embedding::real[], 1) = 384;

-- 768 dimensions (nomic-embed-text)
CREATE INDEX idx_vectors_embed_768 ON alchemy_vectors
    USING hnsw ((embedding::vector(768)) vector_cosine_ops)
    WHERE array_length(embedding::real[], 1) = 768;

-- 1024 dimensions (mxbai-embed-large, bge-large)
CREATE INDEX idx_vectors_embed_1024 ON alchemy_vectors
    USING hnsw ((embedding::vector(1024)) vector_cosine_ops)
    WHERE array_length(embedding::real[], 1) = 1024;

-- 1536 dimensions (text-embedding-3-small, text-embedding-ada-002)
CREATE INDEX idx_vectors_embed_1536 ON alchemy_vectors
    USING hnsw ((embedding::vector(1536)) vector_cosine_ops)
    WHERE array_length(embedding::real[], 1) = 1536;

-- NOTE: text-embedding-3-large (3072 dimensions) exceeds HNSW 2000-dim limit
-- Queries for 3072-dim vectors will use sequential scan (acceptable for typical datasets)

-- 4. Update match_vectors function to use explicit casting for partial index
-- Queries MUST cast to the target dimension to trigger the partial index
CREATE OR REPLACE FUNCTION match_vectors(
    query_embedding vector,
    target_model TEXT DEFAULT 'text-embedding-3-small',
    target_dimensions INT DEFAULT 1536,
    match_threshold FLOAT DEFAULT 0.5,
    match_count INT DEFAULT 10,
    target_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    id UUID,
    signal_id UUID,
    similarity FLOAT,
    title TEXT,
    summary TEXT,
    url TEXT,
    category TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Use dynamic SQL to apply explicit dimension casting
    -- This triggers the partial index for the specified dimension
    RETURN QUERY EXECUTE format(
        'SELECT
            v.id,
            v.signal_id,
            (1 - (v.embedding::vector(%s) <=> $1::vector(%s)))::FLOAT AS similarity,
            s.title,
            s.summary,
            s.url,
            s.category
        FROM alchemy_vectors v
        JOIN signals s ON s.id = v.signal_id
        WHERE v.user_id = $2
            AND v.model = $3
            AND array_length(v.embedding::real[], 1) = %s
            AND 1 - (v.embedding::vector(%s) <=> $1::vector(%s)) > $4
        ORDER BY v.embedding::vector(%s) <=> $1::vector(%s)
        LIMIT $5',
        target_dimensions, target_dimensions,
        target_dimensions,
        target_dimensions, target_dimensions,
        target_dimensions, target_dimensions
    )
    USING query_embedding, target_user_id, target_model, match_threshold, match_count;
END;
$$;

-- 5. Add comment for documentation
COMMENT ON FUNCTION match_vectors(vector, TEXT, INT, FLOAT, INT, UUID) IS
'Semantic similarity search with variable dimension support.
Queries MUST specify target_dimensions to trigger partial indexes.
Filters by model name to ensure only same-model vectors are compared.
Note: HNSW indexes limited to 2000 dimensions; larger vectors use sequential scan.';
