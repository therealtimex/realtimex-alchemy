import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface TTSOptions {
    provider?: string;
    voice?: string;
    speed?: number;
}

export interface UseTTSReturn {
    speak: (text: string, options?: TTSOptions) => Promise<void>;
    speakStream: (text: string, options?: TTSOptions) => Promise<void>;
    stop: () => void;
    isPlaying: boolean;
    isSpeaking: boolean;
}

/**
 * React hook for Text-to-Speech functionality
 * Provides audio playback control for assistant messages
 */
export function useTTS(): UseTTSReturn {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

    /**
     * Stop any currently playing audio
     */
    const stop = useCallback(() => {
        // Stop Web Audio API source
        if (sourceNodeRef.current) {
            try {
                sourceNodeRef.current.stop();
                sourceNodeRef.current.disconnect();
            } catch (e) {
                // Already stopped
            }
            sourceNodeRef.current = null;
        }

        // Stop HTML Audio element
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }

        setIsPlaying(false);
        setIsSpeaking(false);
    }, []);

    /**
     * Generate and play full audio buffer
     */
    const speak = useCallback(async (text: string, options: TTSOptions = {}) => {
        stop(); // Stop any existing playback

        setIsSpeaking(true);

        try {
            // Fetch user settings if not provided
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

            const response = await fetch('/api/tts/speak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, ...finalOptions })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'TTS generation failed');
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onplay = () => setIsPlaying(true);
            audio.onended = () => {
                setIsPlaying(false);
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
            };
            audio.onerror = () => {
                setIsPlaying(false);
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
            };

            await audio.play();
        } catch (error) {
            console.error('[TTS] Speak failed:', error);
            setIsSpeaking(false);
            throw error;
        }
    }, [stop]);

    /**
     * Stream audio chunks and play progressively
     */
    const speakStream = useCallback(async (text: string, options: TTSOptions = {}) => {
        stop(); // Stop any existing playback

        setIsSpeaking(true);

        try {
            // Fetch user settings if not provided
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

            const response = await fetch('/api/tts/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, ...finalOptions })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'TTS streaming failed');
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let buffer = '';
            const audioChunks: ArrayBuffer[] = [];

            // Initialize Web Audio API
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const audioContext = audioContextRef.current;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Parse SSE events
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine || !trimmedLine.startsWith('data:')) continue;

                    const eventData = trimmedLine.slice(5).trim();
                    if (!eventData) continue;

                    try {
                        const parsed = JSON.parse(eventData);

                        if (parsed.audio) {
                            // Decode base64 to ArrayBuffer
                            const binaryString = atob(parsed.audio);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            audioChunks.push(bytes.buffer);

                            // Play first chunk immediately
                            if (audioChunks.length === 1) {
                                await playAudioBuffer(audioContext, bytes.buffer);
                                setIsPlaying(true);
                            }
                        }
                    } catch (e) {
                        console.warn('[TTS] Failed to parse SSE chunk:', e);
                    }
                }
            }

            // Play remaining chunks sequentially
            for (let i = 1; i < audioChunks.length; i++) {
                await playAudioBuffer(audioContext, audioChunks[i]);
            }

            setIsPlaying(false);
            setIsSpeaking(false);
        } catch (error) {
            console.error('[TTS] Stream failed:', error);
            setIsPlaying(false);
            setIsSpeaking(false);
            throw error;
        }
    }, [stop]);

    /**
     * Helper to play an audio buffer using Web Audio API
     */
    const playAudioBuffer = (context: AudioContext, arrayBuffer: ArrayBuffer): Promise<void> => {
        return new Promise((resolve, reject) => {
            context.decodeAudioData(
                arrayBuffer,
                (audioBuffer) => {
                    const source = context.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(context.destination);
                    source.onended = () => resolve();
                    source.start(0);
                    sourceNodeRef.current = source;
                },
                (error) => reject(error)
            );
        });
    };

    return {
        speak,
        speakStream,
        stop,
        isPlaying,
        isSpeaking
    };
}
