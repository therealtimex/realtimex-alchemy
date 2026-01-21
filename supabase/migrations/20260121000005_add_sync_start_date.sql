-- Simplify sync design: Add sync_start_date for timestamp-based filtering
-- This replaces the complex sync_mode system with a simple timestamp approach

-- Add sync_start_date column (primary sync control)
ALTER TABLE public.alchemy_settings
ADD COLUMN IF NOT EXISTS sync_start_date TIMESTAMPTZ;

-- Add last_sync_checkpoint column (for incremental syncing)
ALTER TABLE public.alchemy_settings
ADD COLUMN IF NOT EXISTS last_sync_checkpoint TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN public.alchemy_settings.sync_start_date IS
'Starting timestamp for sync. If set, only URLs after this time are processed. Takes priority over checkpoint.';

COMMENT ON COLUMN public.alchemy_settings.last_sync_checkpoint IS
'Automatic checkpoint tracking the last processed URL timestamp for incremental syncing.';

-- Note: We keep sync_mode and sync_from_date columns for backward compatibility
-- but the simplified logic will primarily use sync_start_date
