import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useTTSContext, TTSOptions } from '../context/TTSContext';

export interface UseTTSReturn {
    speak: (text: string, id?: string, options?: TTSOptions) => Promise<void>;
    speakStream: (text: string, id?: string, options?: TTSOptions) => Promise<void>;
    stop: () => void;
    isPlaying: boolean;
    isSpeaking: boolean;
    speakingId: string | null;
}

/**
 * React hook for Text-to-Speech functionality
 * Refactored to use global TTSContext for singleton playback (preventing voice overlap)
 * Now supports speakingId for granular UI state tracking
 */
export function useTTS(): UseTTSReturn {
    const { speak: contextSpeak, speakStream: contextSpeakStream, stop, isPlaying, isSpeaking, speakingId } = useTTSContext();

    /**
     * Helper to fetch user settings if not provided
     */
    const getFinalOptions = useCallback(async (options: TTSOptions) => {
        let finalOptions = { ...options };
        if (!options.provider && !options.voice) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('alchemy_settings')
                    .select('tts_provider, tts_voice, tts_speed')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (data) {
                    finalOptions = {
                        ...finalOptions,
                        provider: data.tts_provider || undefined,
                        voice: data.tts_voice || undefined,
                        speed: data.tts_speed ? Number(data.tts_speed) : undefined
                    };
                }
            }
        }
        return finalOptions;
    }, []);

    const speak = useCallback(async (text: string, id?: string, options: TTSOptions = {}) => {
        const finalOptions = await getFinalOptions(options);
        return contextSpeak(text, id, finalOptions);
    }, [contextSpeak, getFinalOptions]);

    const speakStream = useCallback(async (text: string, id?: string, options: TTSOptions = {}) => {
        const finalOptions = await getFinalOptions(options);
        return contextSpeakStream(text, id, finalOptions);
    }, [contextSpeakStream, getFinalOptions]);

    return {
        speak,
        speakStream,
        stop,
        isPlaying,
        isSpeaking,
        speakingId
    };
}
