-- Add TTS settings to alchemy_settings table
-- Migration: 20260130000000_add_tts_settings.sql

ALTER TABLE alchemy_settings
ADD COLUMN IF NOT EXISTS tts_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS tts_auto_play BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS tts_provider TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tts_voice TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tts_speed NUMERIC DEFAULT 1.0;

COMMENT ON COLUMN alchemy_settings.tts_enabled IS 'Enable/disable TTS globally';
COMMENT ON COLUMN alchemy_settings.tts_auto_play IS 'Auto-play assistant responses in Chat';
COMMENT ON COLUMN alchemy_settings.tts_provider IS 'Selected TTS provider (e.g., openai, elevenlabs)';
COMMENT ON COLUMN alchemy_settings.tts_voice IS 'Selected voice ID for TTS';
COMMENT ON COLUMN alchemy_settings.tts_speed IS 'Playback speed multiplier (0.5 - 2.0)';
