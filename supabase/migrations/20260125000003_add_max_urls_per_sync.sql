-- Add configurable batch size for sync operations
-- Allows users to control how many URLs are processed per sync

ALTER TABLE public.alchemy_settings
ADD COLUMN IF NOT EXISTS max_urls_per_sync INTEGER DEFAULT 50;

COMMENT ON COLUMN public.alchemy_settings.max_urls_per_sync IS
'Maximum URLs to process per sync. Lower values = faster sync, higher values = more thorough. Default: 50';

-- Add constraint to keep value reasonable
ALTER TABLE public.alchemy_settings
ADD CONSTRAINT max_urls_per_sync_range
CHECK (max_urls_per_sync >= 5 AND max_urls_per_sync <= 200);
