-- Add sync_stop_requested column to alchemy_settings
ALTER TABLE alchemy_settings ADD COLUMN IF NOT EXISTS sync_stop_requested BOOLEAN DEFAULT false;
