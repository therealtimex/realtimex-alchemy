-- Add sound_enabled setting to alchemy_settings
ALTER TABLE public.alchemy_settings
ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT true;
