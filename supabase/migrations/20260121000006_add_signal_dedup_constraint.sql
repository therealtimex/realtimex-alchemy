-- Add unique constraint to prevent duplicate signals for same URL per user

-- Step 1: Remove duplicate signals, keeping only the most recent one for each (user_id, url) pair
DELETE FROM public.signals
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY user_id, url 
                   ORDER BY created_at DESC, score DESC
               ) as rn
        FROM public.signals
    ) t
    WHERE t.rn > 1
);

-- Step 2: Add unique constraint
ALTER TABLE public.signals
ADD CONSTRAINT signals_user_url_unique UNIQUE (user_id, url);

-- Step 3: Create index to support the unique constraint (if not exists)
CREATE INDEX IF NOT EXISTS idx_signals_user_url ON public.signals(user_id, url);
