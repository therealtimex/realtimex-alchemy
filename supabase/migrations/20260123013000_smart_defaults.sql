-- Smart Defaults and Customization Tracking
-- Migration for improved first-run UX

-- 1. Update existing columns with smart defaults
ALTER TABLE alchemy_settings
ALTER COLUMN llm_provider SET DEFAULT 'realtimexai',
ALTER COLUMN llm_model SET DEFAULT 'gpt-4o-mini',
ALTER COLUMN embedding_provider SET DEFAULT 'realtimexai',
ALTER COLUMN embedding_model SET DEFAULT 'text-embedding-3-small',
ALTER COLUMN max_urls_per_sync SET DEFAULT 50,
ALTER COLUMN sync_mode SET DEFAULT 'incremental';

-- 2. Add customization tracking
ALTER TABLE alchemy_settings
ADD COLUMN IF NOT EXISTS customized_at TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- 3. Add comments for documentation
COMMENT ON COLUMN alchemy_settings.llm_model IS 'Default: gpt-4o-mini (fast & cost-effective)';
COMMENT ON COLUMN alchemy_settings.embedding_model IS 'Default: text-embedding-3-small (good balance)';
COMMENT ON COLUMN alchemy_settings.max_urls_per_sync IS 'Default: 50 (safe for first run)';
COMMENT ON COLUMN alchemy_settings.customized_at IS 'Timestamp when user first customized settings (NULL = using defaults)';
COMMENT ON COLUMN alchemy_settings.created_at IS 'Timestamp when settings were created';

-- 4. Update existing rows to have created_at if missing
UPDATE alchemy_settings
SET created_at = NOW()
WHERE created_at IS NULL;
