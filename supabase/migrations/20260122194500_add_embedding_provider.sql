-- Add embedding_provider column to alchemy_settings
-- This stores which RealTimeX provider to use for embeddings

ALTER TABLE alchemy_settings
ADD COLUMN IF NOT EXISTS embedding_provider TEXT DEFAULT 'realtimexai';

COMMENT ON COLUMN alchemy_settings.embedding_provider IS 'RealTimeX embedding provider: realtimexai, openai, or gemini';
