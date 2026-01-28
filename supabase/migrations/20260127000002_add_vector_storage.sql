-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Vectors table (separate from signals for flexibility)
CREATE TABLE alchemy_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id UUID NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    embedding vector(1536) NOT NULL,  -- OpenAI text-embedding-3-small dimension
    model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    created_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(signal_id, model)
);

-- Indexes
CREATE INDEX idx_vectors_user ON alchemy_vectors(user_id);
CREATE INDEX idx_vectors_signal ON alchemy_vectors(signal_id);

-- HNSW index for fast similarity search
CREATE INDEX idx_vectors_embedding ON alchemy_vectors
    USING hnsw (embedding vector_cosine_ops);

-- RLS
ALTER TABLE alchemy_vectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own vectors"
ON alchemy_vectors FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Similarity search function (called via supabase.rpc())
CREATE OR REPLACE FUNCTION match_vectors(
    query_embedding vector(1536),
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
    RETURN QUERY
    SELECT
        v.id,
        v.signal_id,
        (1 - (v.embedding <=> query_embedding))::FLOAT AS similarity,
        s.title,
        s.summary,
        s.url,
        s.category
    FROM alchemy_vectors v
    JOIN signals s ON s.id = v.signal_id
    WHERE v.user_id = target_user_id
        AND 1 - (v.embedding <=> query_embedding) > match_threshold
    ORDER BY v.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
