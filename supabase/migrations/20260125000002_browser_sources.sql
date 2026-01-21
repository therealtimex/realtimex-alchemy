-- Add custom browser paths support to alchemy_settings
-- This allows users to configure multiple browser history sources

ALTER TABLE public.alchemy_settings
ADD COLUMN IF NOT EXISTS custom_browser_paths JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.alchemy_settings.custom_browser_paths IS 
'Array of custom browser history source configurations: [{browser: "chrome", path: "/path/to/History", enabled: true, label: "Chrome (Default)"}]';

-- Example structure:
-- [
--   {
--     "browser": "chrome",
--     "path": "/Users/username/Library/Application Support/Google/Chrome/Default/History",
--     "enabled": true,
--     "label": "Chrome (Default Profile)"
--   },
--   {
--     "browser": "firefox",
--     "path": "/Users/username/Library/Application Support/Firefox/Profiles/xxx.default/places.sqlite",
--     "enabled": false,
--     "label": "Firefox (Personal)"
--   }
-- ]
