-- Add llm_provider and llm_model columns to alchemy_settings
-- Migration for SDK-powered LLM and Embedding configuration

-- Add llm_provider column (realtimexai, openai, anthropic, google, ollama)
ALTER TABLE alchemy_settings
ADD COLUMN IF NOT EXISTS llm_provider TEXT DEFAULT 'realtimexai';

-- Add llm_model column (replaces llm_model_name for consistency)
ALTER TABLE alchemy_settings
ADD COLUMN IF NOT EXISTS llm_model TEXT DEFAULT 'gpt-4o';

-- Add embedding_provider column (already exists from previous migration, but ensure it's there)
ALTER TABLE alchemy_settings
ADD COLUMN IF NOT EXISTS embedding_provider TEXT DEFAULT 'realtimexai';

-- Add comment for documentation
COMMENT ON COLUMN alchemy_settings.llm_provider IS 'LLM provider: realtimexai, openai, anthropic, google, ollama';
COMMENT ON COLUMN alchemy_settings.llm_model IS 'LLM model ID from provider';
COMMENT ON COLUMN alchemy_settings.embedding_provider IS 'Embedding provider: realtimexai, openai, gemini';

-- Note: We keep llm_base_url, llm_model_name, llm_api_key for backward compatibility
-- These are deprecated but maintained for users who haven't migrated to SDK yet
