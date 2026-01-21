-- Migration: Enhance processing_events for richer debugging info

-- Add new columns if they don't exist
ALTER TABLE processing_events ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE processing_events ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE processing_events ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'info'; -- 'debug', 'info', 'warn', 'error'

-- Update existing records to have default level
UPDATE processing_events SET level = 'info' WHERE level IS NULL;

-- Create index for level to allow fast filtering
CREATE INDEX IF NOT EXISTS idx_processing_events_level ON processing_events(level);

-- Ensure Realtime is still enabled (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'processing_events'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE processing_events;
    END IF;
END $$;
