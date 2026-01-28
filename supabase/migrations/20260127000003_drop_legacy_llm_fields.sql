-- Drop legacy LLM fields from alchemy_settings
-- These fields are no longer used since moving to RealTimeX SDK for provider management

-- Drop legacy provider-specific API keys
ALTER TABLE alchemy_settings DROP COLUMN IF EXISTS ollama_host;
ALTER TABLE alchemy_settings DROP COLUMN IF EXISTS openai_api_key;
ALTER TABLE alchemy_settings DROP COLUMN IF EXISTS anthropic_api_key;

-- Drop legacy universal LLM fields (replaced by llm_provider + llm_model)
ALTER TABLE alchemy_settings DROP COLUMN IF EXISTS llm_base_url;
ALTER TABLE alchemy_settings DROP COLUMN IF EXISTS llm_model_name;
ALTER TABLE alchemy_settings DROP COLUMN IF EXISTS llm_api_key;

-- Drop unused embedding fields (SDK handles this now)
ALTER TABLE alchemy_settings DROP COLUMN IF EXISTS embedding_base_url;
ALTER TABLE alchemy_settings DROP COLUMN IF EXISTS embedding_api_key;

-- Update comments to reflect current schema
COMMENT ON TABLE alchemy_settings IS 'User settings for Alchemy - uses RealTimeX SDK for LLM/Embedding providers';
