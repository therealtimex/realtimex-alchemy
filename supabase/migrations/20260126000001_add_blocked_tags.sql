-- Add blocked_tags column to alchemy_settings
ALTER TABLE alchemy_settings ADD COLUMN IF NOT EXISTS blocked_tags TEXT[] DEFAULT '{}'::TEXT[];
