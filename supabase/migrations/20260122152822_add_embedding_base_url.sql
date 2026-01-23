-- Add embedding base URL to alchemy_settings
ALTER TABLE alchemy_settings 
ADD COLUMN IF NOT EXISTS embedding_base_url text;

COMMENT ON COLUMN alchemy_settings.embedding_base_url IS 'Optional base URL for embedding provider (e.g., https://api.openai.com/v1 or http://localhost:11434)';
