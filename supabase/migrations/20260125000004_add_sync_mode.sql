-- Add sync mode settings for flexible history processing
-- Allows users to control how far back to sync browser history

ALTER TABLE public.alchemy_settings
ADD COLUMN IF NOT EXISTS sync_mode TEXT DEFAULT 'incremental',
ADD COLUMN IF NOT EXISTS sync_from_date TIMESTAMPTZ;

-- Validate sync_mode values
ALTER TABLE public.alchemy_settings
ADD CONSTRAINT sync_mode_values
CHECK (sync_mode IN ('incremental', 'last_7_days', 'last_30_days', 'from_date', 'all'));

COMMENT ON COLUMN public.alchemy_settings.sync_mode IS
'Sync mode: incremental (default, only new URLs), last_7_days, last_30_days, from_date (custom), all (full resync)';

COMMENT ON COLUMN public.alchemy_settings.sync_from_date IS
'Custom starting date when sync_mode = from_date';
