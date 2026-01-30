-- Migration to add tts_quality to alchemy_settings
ALTER TABLE public.alchemy_settings 
ADD COLUMN IF NOT EXISTS tts_quality INTEGER DEFAULT 10;

COMMENT ON COLUMN public.alchemy_settings.tts_quality IS 'Supertonic quality (num_inference_steps), 1-20';
