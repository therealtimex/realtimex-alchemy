-- Add tags column to signals table for multi-categorization
ALTER TABLE public.signals 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create GIN index for efficient tag queries
CREATE INDEX IF NOT EXISTS idx_signals_tags ON public.signals USING GIN(tags);

-- Populate tags from existing category and entities
-- This ensures backward compatibility and multi-dimensional categorization
-- Note: entities is JSONB, so we use jsonb_array_elements_text() instead of unnest()
UPDATE public.signals
SET tags = ARRAY[LOWER(category)] || COALESCE(ARRAY(SELECT LOWER(jsonb_array_elements_text(entities))), '{}')
WHERE tags = '{}' AND category IS NOT NULL;

-- For signals without category, use entities only
UPDATE public.signals
SET tags = COALESCE(ARRAY(SELECT LOWER(jsonb_array_elements_text(entities))), '{}')
WHERE tags = '{}' AND category IS NULL AND entities IS NOT NULL AND jsonb_typeof(entities) = 'array';
