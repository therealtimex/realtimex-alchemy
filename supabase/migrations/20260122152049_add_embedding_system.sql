-- Enable pgvector extension for embedding support
CREATE EXTENSION IF NOT EXISTS vector;

-- Signal embeddings table with flexible dimensions
CREATE TABLE signal_embeddings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id uuid REFERENCES signals(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    
    -- Model identification
    model_provider text NOT NULL,  -- 'openai', 'local', 'ollama', 'cohere'
    model_name text NOT NULL,      -- 'text-embedding-3-small', 'Xenova/all-MiniLM-L6-v2', etc.
    dimension int NOT NULL,
    
    -- The embedding vector (unconstrained dimension)
    embedding vector NOT NULL,
    
    -- Metadata
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Constraints
    UNIQUE(signal_id, model_name),
    CHECK (dimension > 0 AND dimension <= 4096)
);

-- Indexes for fast lookups
-- Note: ivfflat indexes require fixed dimensions, so we use standard indexes
-- Users can create dimension-specific indexes manually if needed for performance
CREATE INDEX idx_embeddings_user_model ON signal_embeddings(user_id, model_name);
CREATE INDEX idx_embeddings_signal ON signal_embeddings(signal_id);
CREATE INDEX idx_embeddings_dimension ON signal_embeddings(dimension);

-- RLS policies
ALTER TABLE signal_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own embeddings"
ON signal_embeddings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own embeddings"
ON signal_embeddings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own embeddings"
ON signal_embeddings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own embeddings"
ON signal_embeddings FOR DELETE
USING (auth.uid() = user_id);

-- Background job tracking table
CREATE TABLE embedding_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    model_name text NOT NULL,
    total_signals int NOT NULL,
    processed int DEFAULT 0,
    status text DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
    error_message text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    completed_at timestamptz
);

CREATE INDEX idx_embedding_jobs_user ON embedding_jobs(user_id, status);

ALTER TABLE embedding_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own embedding jobs"
ON embedding_jobs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own embedding jobs"
ON embedding_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own embedding jobs"
ON embedding_jobs FOR UPDATE
USING (auth.uid() = user_id);

-- Helper function for similarity search
CREATE OR REPLACE FUNCTION match_signals(
    query_embedding vector,
    query_dimension int,
    query_model text,
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10,
    target_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
    signal_id uuid,
    similarity float,
    url text,
    title text,
    summary text,
    score int,
    category text,
    created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id as signal_id,
        1 - (e.embedding <=> query_embedding) as similarity,
        s.url,
        s.title,
        s.summary,
        s.score,
        s.category,
        s.created_at
    FROM signal_embeddings e
    JOIN signals s ON s.id = e.signal_id
    WHERE e.user_id = target_user_id
        AND e.model_name = query_model
        AND e.dimension = query_dimension
        AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Add embedding configuration to alchemy_settings
ALTER TABLE alchemy_settings 
ADD COLUMN IF NOT EXISTS embedding_model text DEFAULT 'text-embedding-3-small',
ADD COLUMN IF NOT EXISTS embedding_api_key text;

COMMENT ON COLUMN alchemy_settings.embedding_model IS 'Embedding model name (e.g., text-embedding-3-small, Xenova/all-MiniLM-L6-v2)';
COMMENT ON COLUMN alchemy_settings.embedding_api_key IS 'Optional API key for embedding provider (falls back to llm_api_key if not set)';
