-- Add is_dismissed and learned_topics to signals table
ALTER TABLE signals ADD COLUMN IF NOT EXISTS is_dismissed boolean DEFAULT false;
ALTER TABLE signals ADD COLUMN IF NOT EXISTS learned_topics text[];

-- Add index for is_dismissed for faster filtering
CREATE INDEX IF NOT EXISTS signals_is_dismissed_idx ON signals(is_dismissed);

-- Update RLS policies if needed (assuming existing policies cover updates by owner)
-- The existing policies for 'signals' should already allow updates by the user_id owner.
