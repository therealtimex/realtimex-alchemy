-- Add user interaction columns to signals table
ALTER TABLE public.signals
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS user_notes text DEFAULT null,
ADD COLUMN IF NOT EXISTS is_boosted boolean DEFAULT false;

-- Add checking for is_boosted to index to speed up learning queries potentially
CREATE INDEX IF NOT EXISTS signals_is_boosted_idx ON public.signals (is_boosted) WHERE is_boosted = true;
