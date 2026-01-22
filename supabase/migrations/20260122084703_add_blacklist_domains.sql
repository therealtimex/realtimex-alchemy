-- Add blacklist_domains column to alchemy_settings
-- This allows users to customize which domain patterns are excluded from mining

ALTER TABLE alchemy_settings 
ADD COLUMN IF NOT EXISTS blacklist_domains TEXT[] DEFAULT ARRAY[
    'google.com/search',
    'localhost:',
    '127.0.0.1',
    'facebook.com',
    'twitter.com',
    'instagram.com',
    'linkedin.com/feed'
]::TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN alchemy_settings.blacklist_domains IS 'List of domain patterns to exclude from mining. URLs containing these patterns will be skipped.';
