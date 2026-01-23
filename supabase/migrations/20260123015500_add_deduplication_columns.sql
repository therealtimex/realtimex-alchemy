-- Add deduplication tracking columns to signals table
-- Migration for smart signal merging and embedding tracking

-- 1. Add mention_count for tracking duplicate signals
ALTER TABLE signals
ADD COLUMN IF NOT EXISTS mention_count INTEGER DEFAULT 1;

-- 2. Add embedding tracking columns
ALTER TABLE signals
ADD COLUMN IF NOT EXISTS has_embedding BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS embedding_model TEXT;

-- 3. Add metadata column if it doesn't exist (for source URLs tracking)
ALTER TABLE signals
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 4. Add index for efficient duplicate detection
CREATE INDEX IF NOT EXISTS idx_signals_mention_count ON signals(mention_count) WHERE mention_count > 1;
CREATE INDEX IF NOT EXISTS idx_signals_has_embedding ON signals(has_embedding) WHERE has_embedding = TRUE;

-- 5. Add comments for documentation
COMMENT ON COLUMN signals.mention_count IS 'Number of times this signal was seen (1 = unique, >1 = merged duplicate)';
COMMENT ON COLUMN signals.has_embedding IS 'Whether this signal has an embedding stored in vector database';
COMMENT ON COLUMN signals.embedding_model IS 'Embedding model used (e.g., text-embedding-3-small)';
COMMENT ON COLUMN signals.metadata IS 'Additional metadata including source_urls array for merged signals';
