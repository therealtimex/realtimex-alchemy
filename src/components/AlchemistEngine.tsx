import React, { useState, useEffect } from 'react';
import { Cpu, Save, Loader2, Database, Zap, Hash, Volume2 } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { BrowserSourceManager, type BrowserSource } from './BrowserSourceManager';
import { Switch } from './Switch';
import { useToast } from '../context/ToastContext';
import { BLOCKED_TAGS as DEFAULT_BLOCKED_TAGS } from '../../shared/constants';
import { useTranslation } from 'react-i18next';

export function AlchemistEngine() {
    const { t } = useTranslation();
    const { showToast } = useToast();
    // Provider/model defaults - realtimexai routes through RealTimeX Desktop
    const [llmProvider, setLlmProvider] = useState('realtimexai');
    const [llmModel, setLlmModel] = useState('gpt-4.1-mini');
    const [embeddingProvider, setEmbeddingProvider] = useState('realtimexai');
    const [embeddingModel, setEmbeddingModel] = useState('text-embedding-3-small');
    // Other settings
    const [browserSources, setBrowserSources] = useState<BrowserSource[]>([]);
    const [blacklistDomains, setBlacklistDomains] = useState<string[]>([]);
    const [blockedTags, setBlockedTags] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingBrowser, setIsSavingBrowser] = useState(false);
    const [isSavingBlacklist, setIsSavingBlacklist] = useState(false);
    const [isSavingBlockedTags, setIsSavingBlockedTags] = useState(false);
    // TTS settings
    const [ttsProvider, setTtsProvider] = useState('');
    const [ttsVoice, setTtsVoice] = useState('');
    const [ttsSpeed, setTtsSpeed] = useState(1.0);
    const [ttsQuality, setTtsQuality] = useState(10);
    const [ttsAutoPlay, setTtsAutoPlay] = useState(true);
    const [ttsProviders, setTtsProviders] = useState<any[]>([]);
    const [availableVoices, setAvailableVoices] = useState<string[]>([]);
    const [isPlayingTest, setIsPlayingTest] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    // SDK state
    const [sdkAvailable, setSdkAvailable] = useState(false);
    const [sdkProviders, setSdkProviders] = useState<any>(null);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [availableLLMModels, setAvailableLLMModels] = useState<string[]>([]);

    useEffect(() => {
        // Load settings first, then SDK providers with loaded settings (to avoid race condition)
        fetchSettings().then((loadedSettings) => {
            fetchSDKProviders(loadedSettings);
            fetchTTSProviders(loadedSettings);
        });
        fetchPersona();
    }, []);

    // Return type for settings loaded from DB
    interface LoadedSettings {
        llmProvider: string;
        llmModel: string;
        embeddingProvider: string;
        embeddingModel: string;
        ttsProvider: string;
        ttsVoice: string;
        ttsSpeed: number;
        ttsQuality: number;
        ttsAutoPlay: boolean;
    }

    const fetchSettings = async (): Promise<LoadedSettings> => {
        // Default values (used if no DB settings)
        const defaults: LoadedSettings = {
            llmProvider: 'realtimexai',
            llmModel: 'gpt-4.1-mini',
            embeddingProvider: 'realtimexai',
            embeddingModel: 'text-embedding-3-small',
            ttsProvider: '',
            ttsVoice: '',
            ttsSpeed: 1.0,
            ttsQuality: 10,
            ttsAutoPlay: true
        };

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return defaults;

        const { data } = await supabase
            .from('alchemy_settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (data) {
            // Set provider/model from DB, falling back to defaults
            const loadedLlmProvider = data.llm_provider || defaults.llmProvider;
            const loadedLlmModel = data.llm_model || defaults.llmModel;
            const loadedEmbedProvider = data.embedding_provider || defaults.embeddingProvider;
            const loadedEmbedModel = data.embedding_model || defaults.embeddingModel;

            setLlmProvider(loadedLlmProvider);
            setLlmModel(loadedLlmModel);
            setEmbeddingProvider(loadedEmbedProvider);
            setEmbeddingModel(loadedEmbedModel);

            setTtsProvider(data.tts_provider || defaults.ttsProvider);
            setTtsVoice(data.tts_voice || defaults.ttsVoice);
            setTtsSpeed(data.tts_speed ? parseFloat(data.tts_speed) : defaults.ttsSpeed);
            setTtsQuality(data.tts_quality ? parseInt(data.tts_quality) : defaults.ttsQuality);
            setTtsAutoPlay(data.tts_auto_play !== undefined ? data.tts_auto_play : defaults.ttsAutoPlay);

            setBrowserSources(data.custom_browser_paths || []);
            setBlacklistDomains(data.blacklist_domains || []);

            // Use user tags if they exist, otherwise default to system list
            const userTags = data.blocked_tags || [];
            if (userTags.length > 0) {
                setBlockedTags(userTags);
            } else {
                setBlockedTags(Array.from(DEFAULT_BLOCKED_TAGS));
            }

            return {
                llmProvider: loadedLlmProvider,
                llmModel: loadedLlmModel,
                embeddingProvider: loadedEmbedProvider,
                embeddingModel: loadedEmbedModel,
                ttsProvider: data.tts_provider || defaults.ttsProvider,
                ttsVoice: data.tts_voice || defaults.ttsVoice,
                ttsSpeed: data.tts_speed ? parseFloat(data.tts_speed) : defaults.ttsSpeed,
                ttsQuality: data.tts_quality ? parseInt(data.tts_quality) : defaults.ttsQuality,
                ttsAutoPlay: data.tts_auto_play !== undefined ? data.tts_auto_play : defaults.ttsAutoPlay
            };
        } else {
            // New user - create settings with auto-discovered browser sources
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

            let initialSources = [];
            try {
                const { data: discoverData } = await axios.get('/api/browser-paths/auto-discover');
                if (discoverData.success) {
                    initialSources = discoverData.sources;
                }
            } catch (err) {
                console.warn('[AlchemistEngine] Auto-discovery failed:', err);
            }

            const { data: newSettings } = await supabase.from('alchemy_settings').insert({
                user_id: user.id,
                llm_provider: defaults.llmProvider,
                llm_model: defaults.llmModel,
                embedding_provider: defaults.embeddingProvider,
                embedding_model: defaults.embeddingModel,
                max_urls_per_sync: 50,
                sync_mode: 'incremental',
                sync_start_date: thirtyDaysAgo,
                custom_browser_paths: initialSources
            }).select().single();

            if (newSettings) {
                setBrowserSources(newSettings.custom_browser_paths || []);
            }

            return defaults;
        }
    };

    const fetchSDKProviders = async (loadedSettings?: LoadedSettings) => {
        // Use loaded settings or fall back to defaults
        const currentLlmProvider = loadedSettings?.llmProvider || 'realtimexai';
        const currentLlmModel = loadedSettings?.llmModel || 'gpt-4.1-mini';
        const currentEmbedProvider = loadedSettings?.embeddingProvider || 'realtimexai';
        const currentEmbedModel = loadedSettings?.embeddingModel || 'text-embedding-3-small';

        try {
            // Fetch both chat and embed providers from RealTimeX SDK (via local proxy)
            const [chatResponse, embedResponse] = await Promise.all([
                axios.get('/api/sdk/providers/chat', { timeout: 65000 }), // 65s timeout (SDK may take up to 60s)
                axios.get('/api/sdk/providers/embed', { timeout: 65000 })
            ]);

            if (chatResponse.data.success && embedResponse.data.success) {
                const chatProviders = chatResponse.data.providers || [];
                const embedProviders = embedResponse.data.providers || [];

                setSdkProviders({
                    chat: chatProviders,
                    embed: embedProviders
                });
                setSdkAvailable(true);

                // Validate and set LLM provider/model
                if (chatProviders.length > 0) {
                    const providerExists = chatProviders.some((p: any) => p.provider === currentLlmProvider);
                    if (providerExists) {
                        // Provider exists - check if model exists, otherwise use first model
                        const providerData = chatProviders.find((p: any) => p.provider === currentLlmProvider);
                        const modelExists = providerData?.models?.some((m: any) => m.id === currentLlmModel);
                        if (!modelExists && providerData?.models?.length > 0) {
                            setLlmModel(providerData.models[0].id);
                        }
                    } else {
                        // Provider doesn't exist - use first available
                        const firstProvider = chatProviders[0];
                        setLlmProvider(firstProvider.provider);
                        if (firstProvider.models?.length > 0) {
                            setLlmModel(firstProvider.models[0].id);
                        }
                    }
                    updateAvailableLLMModels(providerExists ? currentLlmProvider : chatProviders[0].provider, chatProviders);
                }

                // Validate and set embedding provider/model
                if (embedProviders.length > 0) {
                    const providerExists = embedProviders.some((p: any) => p.provider === currentEmbedProvider);
                    if (providerExists) {
                        // Provider exists - check if model exists, otherwise use first model
                        const providerData = embedProviders.find((p: any) => p.provider === currentEmbedProvider);
                        const modelExists = providerData?.models?.some((m: any) => m.id === currentEmbedModel);
                        if (!modelExists && providerData?.models?.length > 0) {
                            setEmbeddingModel(providerData.models[0].id);
                        }
                    } else {
                        // Provider doesn't exist - use first available
                        const firstProvider = embedProviders[0];
                        setEmbeddingProvider(firstProvider.provider);
                        if (firstProvider.models?.length > 0) {
                            setEmbeddingModel(firstProvider.models[0].id);
                        }
                    }
                    updateAvailableModels(providerExists ? currentEmbedProvider : embedProviders[0].provider, embedProviders);
                }
            }
        } catch (error) {
            setSdkAvailable(false);
        }
    };

    const fetchTTSProviders = async (loadedSettings?: LoadedSettings) => {
        try {
            const { data } = await axios.get('/api/tts/providers');
            if (data.success && data.providers) {
                // Filter to configured providers only according to SDK docs
                const available = data.providers.filter((p: any) => p.configured);
                setTtsProviders(available);

                // Initialize configured provider/voice availability
                const currentProvider = loadedSettings?.ttsProvider || '';
                if (currentProvider && available.some((p: any) => p.id === currentProvider)) {
                    updateAvailableVoices(currentProvider, available);
                } else if (available.length > 0) {
                    // Default to first configured provider
                    const firstId = available[0].id;
                    setTtsProvider(firstId);
                    updateAvailableVoices(firstId, available);
                }
            }
        } catch (error) {
            console.error('[AlchemistEngine] Failed to fetch TTS providers:', error);
        }
    };

    const updateAvailableVoices = (providerId: string, providersData: any[] = ttsProviders) => {
        const providerData = providersData.find(p => p.id === providerId);
        if (providerData && providerData.config?.voices) {
            setAvailableVoices(providerData.config.voices);
        } else {
            setAvailableVoices([]);
        }
    };

    const updateAvailableModels = (provider: string, providersData: any) => {
        // Use SDK-provided embedding models if available
        if (providersData && Array.isArray(providersData)) {
            const providerData = providersData.find((p: any) => p.provider === provider);
            if (providerData && providerData.models) {
                const modelIds = providerData.models.map((m: any) => m.id);
                setAvailableModels(modelIds);
                return;
            }
        }

        // Fallback to hardcoded embedding models
        const models: string[] = [];

        if (provider === 'realtimexai' || provider === 'openai') {
            models.push('text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002');
        } else if (provider === 'gemini') {
            models.push('embedding-001');
        }

        setAvailableModels(models);
    };

    const updateAvailableLLMModels = (provider: string, providersData: any) => {
        // Use SDK-provided chat models if available (new array format)
        if (providersData && Array.isArray(providersData)) {
            const providerData = providersData.find((p: any) => p.provider === provider);
            if (providerData && providerData.models) {
                const modelIds = providerData.models.map((m: any) => m.id);
                setAvailableLLMModels(modelIds);
                return;
            }
        }

        // Fallback to hardcoded models if SDK not available
        const models: string[] = [];

        if (provider === 'realtimexai' || provider === 'openai') {
            models.push('gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo');
        } else if (provider === 'anthropic') {
            models.push('claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229');
        } else if (provider === 'google') {
            models.push('gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash');
        } else if (provider === 'ollama') {
            models.push('llama3', 'mistral', 'codellama', 'phi');
        }

        setAvailableLLMModels(models);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                showToast(t('engine.save_error_login'), 'error');
                setIsSaving(false);
                return;
            }

            const { error } = await supabase
                .from('alchemy_settings')
                .upsert(
                    {
                        user_id: user.id,
                        llm_provider: llmProvider,
                        llm_model: llmModel,
                        embedding_provider: embeddingProvider,
                        embedding_model: embeddingModel,
                        tts_provider: ttsProvider || null, // specific null handling for empty string
                        tts_voice: ttsVoice || null,
                        tts_speed: ttsSpeed,
                        tts_quality: ttsQuality,
                        tts_auto_play: ttsAutoPlay,
                        customized_at: new Date().toISOString()
                    },
                    {
                        onConflict: 'user_id'
                    }
                );

            if (error) {
                console.error('[AlchemistEngine] Save error:', error);
                showToast(`${t('common.error')}: ${error.message}`, 'error');
            } else {
                showToast(t('engine.save_success_llm'), 'success');
            }
        } catch (err: any) {
            console.error('[AlchemistEngine] Unexpected error:', err);
            showToast(`Unexpected error: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveBrowserSources = async () => {
        setIsSavingBrowser(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                showToast(t('engine.save_error_login'), 'error');
                setIsSavingBrowser(false);
                return;
            }

            const { error } = await supabase
                .from('alchemy_settings')
                .upsert(
                    {
                        user_id: user.id,
                        custom_browser_paths: browserSources
                    },
                    {
                        onConflict: 'user_id'
                    }
                );

            if (error) {
                console.error('[AlchemistEngine] Save browser sources error:', error);
                showToast(`${t('common.error')}: ${error.message}`, 'error');
            } else {
                showToast(t('engine.save_success_browser'), 'success');
            }
        } catch (err: any) {
            console.error('[AlchemistEngine] Unexpected error:', err);
            showToast(`Unexpected error: ${err.message}`, 'error');
        } finally {
            setIsSavingBrowser(false);
        }
    };

    const handleSaveBlacklist = async () => {
        setIsSavingBlacklist(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                showToast(t('engine.save_error_login'), 'error');
                setIsSavingBlacklist(false);
                return;
            }

            // Filter out empty lines before saving
            const cleanedDomains = blacklistDomains.filter(d => d.trim().length > 0);

            const { error } = await supabase
                .from('alchemy_settings')
                .upsert(
                    {
                        user_id: user.id,
                        blacklist_domains: cleanedDomains
                    },
                    {
                        onConflict: 'user_id'
                    }
                );

            if (error) {
                console.error('[AlchemistEngine] Save blacklist error:', error);
                showToast(`${t('common.error')}: ${error.message}`, 'error');
            } else {
                showToast(t('engine.save_success_blacklist'), 'success');
                await fetchSettings(); // Refresh settings
            }
        } catch (err: any) {
            console.error('[AlchemistEngine] Unexpected error:', err);
            showToast(`Unexpected error: ${err.message}`, 'error');
        } finally {
            setIsSavingBlacklist(false);
        }
    };

    const handleSaveBlockedTags = async () => {
        setIsSavingBlockedTags(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                showToast(t('engine.save_error_login'), 'error');
                setIsSavingBlockedTags(false);
                return;
            }

            // Filter out empty lines before saving
            const cleanedTags = blockedTags.filter(d => d.trim().length > 0);

            const { error } = await supabase
                .from('alchemy_settings')
                .upsert(
                    {
                        user_id: user.id,
                        blocked_tags: cleanedTags
                    },
                    {
                        onConflict: 'user_id'
                    }
                );

            if (error) {
                console.error('[AlchemistEngine] Save blocked tags error:', error);
                showToast(`${t('common.error')}: ${error.message}`, 'error');
            } else {
                showToast(t('engine.save_success_tags'), 'success');
                await fetchSettings(); // Refresh settings
            }
        } catch (err: any) {
            console.error('[AlchemistEngine] Unexpected error:', err);
            showToast(`Unexpected error: ${err.message}`, 'error');
        } finally {
            setIsSavingBlockedTags(false);
        }
    };

    const [personaInterest, setPersonaInterest] = useState('');
    const [personaAntiPatterns, setPersonaAntiPatterns] = useState('');
    const [isSavingPersona, setIsSavingPersona] = useState(false);

    const fetchPersona = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('user_persona')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (data) {
            setPersonaInterest(data.interest_summary || '');
            setPersonaAntiPatterns(data.anti_patterns || '');
        }
    };

    const handleSavePersona = async () => {
        setIsSavingPersona(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                showToast('Please log in to save persona', 'error');
                setIsSavingPersona(false);
                return;
            }

            const { error } = await supabase
                .from('user_persona')
                .upsert({
                    user_id: user.id,
                    interest_summary: personaInterest,
                    anti_patterns: personaAntiPatterns,
                    last_updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) {
                console.error('[AlchemistEngine] Save persona error:', error);
                showToast(`${t('common.error')}: ${error.message}`, 'error');
            } else {
                showToast(t('engine.save_success_persona'), 'success');
            }
        } catch (err: any) {
            console.error('[AlchemistEngine] Unexpected error:', err);
            showToast(`Unexpected error: ${err.message}`, 'error');
        } finally {
            setIsSavingPersona(false);
        }
    };

    const handleTestVoice = async () => {
        setIsPlayingTest(true);
        try {
            const response = await fetch('/api/tts/speak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: "Hello, this is a test of the selected voice.",
                    provider: ttsProvider,
                    voice: ttsVoice,
                    speed: ttsSpeed,
                    quality: ttsQuality
                })
            });

            if (!response.ok) throw new Error('TTS generation failed');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);

            audio.onended = () => {
                setIsPlayingTest(false);
                URL.revokeObjectURL(url);
            };
            audio.onerror = () => {
                setIsPlayingTest(false);
                URL.revokeObjectURL(url);
                showToast(t('engine.test_fail', { message: 'Audio playback failed' }), 'error');
            };

            await audio.play();
        } catch (error: any) {
            console.error('Test voice failed:', error);
            setIsPlayingTest(false);
            showToast(`${t('common.error')}: ${error.message}`, 'error');
        }
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        try {
            const { data } = await axios.post('/api/llm/test', {
                baseUrl,
                modelName,
                apiKey
            });

            if (data.success) {
                showToast(t('engine.test_success', { model: data.model || '' }), 'success');
            } else {
                showToast(`${t('engine.test_fail', { message: data.message })}`, 'error');
            }
        } catch (err: any) {
            console.error('[AlchemistEngine] Test error:', err);
            showToast(`Test failed: ${err.message}`, 'error');
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <header className="px-8 py-6 border-b border-border">
                <h2 className="text-2xl font-bold tracking-tight">{t('engine.title')}</h2>
                <p className="text-sm text-fg/50 font-medium">{t('engine.subtitle')}</p>
            </header>

            <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {/* AI Configuration - Unified section spanning both columns */}
                    <section className="space-y-6 mb-8">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-widest text-fg/40 flex items-center gap-2">
                                <Cpu size={14} /> {t('engine.configuration')}
                            </label>
                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleTestConnection}
                                    disabled={isTesting || isSaving}
                                    className="px-6 py-3 bg-surface hover:bg-surface/80 border border-border text-fg font-bold rounded-xl shadow-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2">
                                    {isTesting ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} className="text-accent" />}
                                    {t('engine.test_connection')}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg glow-primary hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2">
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    {t('engine.save_config')}
                                </button>
                            </div>
                        </div>

                        {/* 2-column grid for LLM and Embedding */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* LLM Provider */}
                            <div className="glass p-6 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-fg/80">{t('engine.llm_provider')}</h3>
                                    {sdkAvailable ? (
                                        <span className="text-xs text-green-500 flex items-center gap-1">
                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                            {t('engine.sdk_connected')}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-orange-500 flex items-center gap-1">
                                            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                            {t('engine.sdk_not_available')}
                                        </span>
                                    )}
                                </div>

                                {/* Provider Dropdown */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-fg/60">{t('engine.provider')}</label>
                                    <select
                                        value={llmProvider}
                                        onChange={(e) => {
                                            setLlmProvider(e.target.value);
                                            updateAvailableLLMModels(e.target.value, sdkProviders?.chat);
                                        }}
                                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-fg focus:outline-none focus:ring-2 focus:ring-primary/50">
                                        {sdkProviders?.chat && sdkProviders.chat.length > 0 ? (
                                            sdkProviders.chat.map((p: any) => (
                                                <option key={p.provider} value={p.provider}>
                                                    {p.provider === 'realtimexai' ? 'RealTimeX.AI' : p.provider.charAt(0).toUpperCase() + p.provider.slice(1)}
                                                </option>
                                            ))
                                        ) : (
                                            <option value="" disabled>{t('engine.loading_providers')}</option>
                                        )}
                                    </select>
                                </div>

                                {/* Model Dropdown */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-fg/60">{t('engine.intelligence_model')}</label>
                                    <select
                                        value={llmModel}
                                        onChange={(e) => setLlmModel(e.target.value)}
                                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-fg focus:outline-none focus:ring-2 focus:ring-primary/50">
                                        {availableLLMModels.length > 0 ? (
                                            availableLLMModels.map(model => (
                                                <option key={model} value={model}>{model}</option>
                                            ))
                                        ) : (
                                            <>
                                                <option value="gpt-4o">gpt-4o</option>
                                                <option value="gpt-4o-mini">gpt-4o-mini</option>
                                                <option value="gpt-4-turbo">gpt-4-turbo</option>
                                            </>
                                        )}
                                    </select>
                                </div>

                                {/* Info Text */}
                                <div className="p-3 bg-primary/5 rounded-xl">
                                    <p className="text-[10px] text-primary/60 font-medium leading-relaxed">
                                        {sdkAvailable
                                            ? t('engine.sdk_info_success')
                                            : t('engine.sdk_info_fail')}
                                    </p>
                                </div>
                            </div>

                            {/* Embedding Provider */}
                            <div className="glass p-6 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-fg/80">{t('engine.embedding_provider')}</h3>
                                    {sdkAvailable ? (
                                        <span className="text-xs text-green-500 flex items-center gap-1">
                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                            {t('engine.sdk_connected')}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-orange-500 flex items-center gap-1">
                                            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                            {t('engine.sdk_not_available')}
                                        </span>
                                    )}
                                </div>

                                {/* Provider Dropdown */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-fg/60">{t('engine.provider')}</label>
                                    <select
                                        value={embeddingProvider}
                                        onChange={(e) => {
                                            setEmbeddingProvider(e.target.value);
                                            updateAvailableModels(e.target.value, sdkProviders?.embed);
                                        }}
                                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-fg focus:outline-none focus:ring-2 focus:ring-primary/50">
                                        {sdkProviders?.embed && sdkProviders.embed.length > 0 ? (
                                            sdkProviders.embed.filter((p: any) => p && p.provider).map((p: any) => (
                                                <option key={p.provider} value={p.provider}>
                                                    {p.provider === 'realtimexai' ? 'RealTimeX.AI' : (p.provider.charAt(0).toUpperCase() + p.provider.slice(1))}
                                                </option>
                                            ))
                                        ) : (
                                            <option value="" disabled>{t('engine.loading_providers')}</option>
                                        )}
                                    </select>
                                </div>

                                {/* Model Dropdown */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-fg/60">{t('engine.embedding_model')}</label>
                                    <select
                                        value={embeddingModel}
                                        onChange={(e) => setEmbeddingModel(e.target.value)}
                                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-fg focus:outline-none focus:ring-2 focus:ring-primary/50">
                                        {availableModels.length > 0 ? (
                                            availableModels.map(model => (
                                                <option key={model} value={model}>{model}</option>
                                            ))
                                        ) : (
                                            <>
                                                <option value="text-embedding-3-small">text-embedding-3-small</option>
                                                <option value="text-embedding-3-large">text-embedding-3-large</option>
                                                <option value="text-embedding-ada-002">text-embedding-ada-002</option>
                                            </>
                                        )}
                                    </select>
                                </div>

                                {/* Info Text */}
                                <div className="p-3 bg-primary/5 rounded-xl">
                                    <p className="text-[10px] text-primary/60 font-medium leading-relaxed">
                                        {sdkAvailable
                                            ? t('engine.embedding_info_success')
                                            : t('engine.embedding_info_fail')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 mt-8">
                            <div className="glass p-8 space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-bold tracking-tight">{t('account.tts_title')}</h3>
                                        <Switch
                                            id="tts_auto_play"
                                            checked={ttsAutoPlay}
                                            onChange={setTtsAutoPlay}
                                            label={t('account.tts_auto_play')}
                                            size="sm"
                                        />
                                    </div>
                                    <button
                                        onClick={handleTestVoice}
                                        disabled={isPlayingTest}
                                        className="px-4 py-2 bg-surface hover:bg-surface/80 border border-border rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2">
                                        {isPlayingTest ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
                                        {t('account.tts_test')}
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Line 1: Provider | Voice */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-fg/60">{t('account.tts_provider')}</label>
                                            <select
                                                value={ttsProvider}
                                                onChange={(e) => {
                                                    setTtsProvider(e.target.value);
                                                    updateAvailableVoices(e.target.value);
                                                    setTtsVoice('');
                                                }}
                                                className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-fg focus:outline-none focus:ring-2 focus:ring-primary/50">
                                                <option value="">{t('common.system_default')}</option>
                                                {ttsProviders.map((p: any) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.id === 'realtimexai' ? 'RealTimeX.AI' : (p.name || p.id)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-fg/60">{t('account.tts_voice')}</label>
                                            <select
                                                value={ttsVoice}
                                                onChange={(e) => setTtsVoice(e.target.value)}
                                                disabled={!ttsProvider && availableVoices.length === 0}
                                                className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-fg focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50">
                                                <option value="">{t('common.default') || 'Default'}</option>
                                                {availableVoices.map(voice => (
                                                    <option key={voice} value={voice}>{voice}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Line 2: Quality | Speed */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-fg/60 flex justify-between">
                                                {t('account.tts_quality')}
                                                <span className="text-fg/40">{ttsQuality}</span>
                                            </label>
                                            <input
                                                type="range"
                                                min="1"
                                                max="20"
                                                step="1"
                                                value={ttsQuality}
                                                onChange={(e) => setTtsQuality(parseInt(e.target.value))}
                                                className="w-full mt-3 accent-primary cursor-pointer"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-fg/60 flex justify-between">
                                                {t('account.tts_speed')}
                                                <span className="text-fg/40">{ttsSpeed.toFixed(1)}x</span>
                                            </label>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="2.0"
                                                step="0.1"
                                                value={ttsSpeed}
                                                onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                                                className="w-full mt-3 accent-primary cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </section>

                    {/* Persona Memory Section */}
                    <section className="space-y-6 mb-8">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-widest text-fg/40 flex items-center gap-2">
                                <span className="text-xl">🧠</span> {t('engine.persona_title')}
                            </label>
                            {/* Save Button */}
                            <button
                                onClick={handleSavePersona}
                                disabled={isSavingPersona}
                                className="px-6 py-3 bg-surface hover:bg-surface/80 border border-border text-fg font-bold rounded-xl shadow-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2">
                                {isSavingPersona ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                {t('engine.save_memory')}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Interests */}
                            <div className="glass p-6 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-fg/80">{t('engine.interests_title')}</h3>
                                    <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">{t('engine.interests_priority')}</span>
                                </div>
                                <p className="text-xs text-fg/50 leading-relaxed">
                                    {t('engine.interests_desc')}
                                </p>
                                <textarea
                                    value={personaInterest}
                                    onChange={(e) => setPersonaInterest(e.target.value)}
                                    placeholder={t('engine.interests_placeholder')}
                                    className="w-full h-32 px-4 py-3 bg-surface border border-border rounded-xl text-sm text-fg placeholder:text-fg/40 focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none"
                                />
                            </div>

                            {/* Anti-Patterns */}
                            <div className="glass p-6 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-fg/80">{t('engine.antipatterns_title')}</h3>
                                    <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-full border border-red-500/20">{t('engine.antipatterns_priority')}</span>
                                </div>
                                <p className="text-xs text-fg/50 leading-relaxed">
                                    {t('engine.antipatterns_desc')}
                                </p>
                                <textarea
                                    value={personaAntiPatterns}
                                    onChange={(e) => setPersonaAntiPatterns(e.target.value)}
                                    placeholder={t('engine.antipatterns_placeholder')}
                                    className="w-full h-32 px-4 py-3 bg-surface border border-border rounded-xl text-sm text-fg placeholder:text-fg/40 focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none"
                                />
                            </div>
                        </div>
                    </section>

                    {/* 2-column grid for Browser Sources and Blacklist */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Browser History Sources */}
                        <section className="space-y-6">
                            <div className="space-y-4">
                                <label className="text-xs font-bold uppercase tracking-widest text-fg/40 flex items-center gap-2">
                                    <Database size={14} /> {t('engine.browser_sources')}
                                </label>

                                <div className="glass p-8 space-y-6">
                                    <BrowserSourceManager
                                        sources={browserSources}
                                        onChange={setBrowserSources}
                                    />

                                    {/* Save Button */}
                                    <div className="flex justify-end pt-2">
                                        <button
                                            onClick={handleSaveBrowserSources}
                                            disabled={isSavingBrowser}
                                            className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg glow-primary hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2">
                                            {isSavingBrowser ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                            {t('engine.save_browser')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Blacklist Domains */}
                        <section className="space-y-6">
                            <div className="space-y-4">
                                <label className="text-xs font-bold uppercase tracking-widest text-fg/40 flex items-center gap-2">
                                    <Zap size={14} /> {t('engine.blacklist_title')}
                                </label>

                                <div className="glass p-8 space-y-6">
                                    <div className="space-y-2">
                                        <p className="text-sm text-fg/60">
                                            {t('engine.blacklist_desc')}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">
                                            {t('engine.blacklist_label')}
                                        </label>
                                        <textarea
                                            value={blacklistDomains.join('\n')}
                                            onChange={(e) => setBlacklistDomains(
                                                e.target.value.split('\n').map(d => d.trim())
                                            )}
                                            placeholder={t('engine.blacklist_placeholder')}
                                            className="w-full h-40 px-4 py-3 rounded-xl border border-border bg-surface text-fg text-sm placeholder:text-fg/40 focus:outline-none focus:border-[var(--border-hover)] transition-all resize-none"
                                        />
                                        <p className="text-xs text-fg/50 ml-1">
                                            {t('engine.blacklist_examples')}
                                        </p>
                                    </div>

                                    {/* Save Button */}
                                    <div className="flex justify-end pt-2">
                                        <button
                                            onClick={handleSaveBlacklist}
                                            disabled={isSavingBlacklist}
                                            className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg glow-primary hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2">
                                            {isSavingBlacklist ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                            {t('engine.save_blacklist')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>


                    {/* Blocked Tags */}
                    <section className="space-y-6 mt-8">
                        <div className="space-y-4">
                            <label className="text-xs font-bold uppercase tracking-widest text-fg/40 flex items-center gap-2">
                                <Hash size={14} /> {t('engine.blocked_tags_title')}
                            </label>

                            <div className="glass p-8 space-y-6">
                                <div className="space-y-2">
                                    <p className="text-sm text-fg/60">
                                        {t('engine.blocked_tags_desc')}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">
                                        {t('engine.blocked_tags_label')}
                                    </label>
                                    <textarea
                                        value={blockedTags.join('; ')}
                                        onChange={(e) => setBlockedTags(
                                            e.target.value.split(';').map(t => t.trim())
                                        )}
                                        placeholder={t('engine.blocked_tags_placeholder')}
                                        className="w-full h-40 px-4 py-3 rounded-xl border border-border bg-surface text-fg text-sm placeholder:text-fg/40 focus:outline-none focus:border-[var(--border-hover)] transition-all resize-none"
                                    />
                                    <p className="text-xs text-fg/50 ml-1">
                                        {t('engine.blocked_tags_info')}
                                    </p>
                                </div>

                                {/* Save Button */}
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={handleSaveBlockedTags}
                                        disabled={isSavingBlockedTags}
                                        className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg glow-primary hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        {isSavingBlockedTags ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        {t('engine.save_blocked_tags')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

function InputGroup({ label, value, onChange, placeholder, type = 'text' }: { label: string, value: string, onChange: (v: string) => void, placeholder: string, type?: string }) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-fg placeholder:text-fg/40 focus:border-[var(--border-hover)] outline-none transition-all autofill:bg-surface autofill:text-fg"
                placeholder={placeholder}
            />
        </div>
    );
}

