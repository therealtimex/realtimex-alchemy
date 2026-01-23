import React, { useState, useEffect } from 'react';
import { Cpu, Save, Loader2, Database, Zap } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { BrowserSourceManager, type BrowserSource } from './BrowserSourceManager';
import { useToast } from '../context/ToastContext';

export function AlchemistEngine() {
    const { showToast } = useToast();
    const [baseUrl, setBaseUrl] = useState('http://localhost:11434');
    const [modelName, setModelName] = useState('llama3');
    const [llmProvider, setLlmProvider] = useState('realtimexai');
    const [llmModel, setLlmModel] = useState('gpt-4o');
    const [apiKey, setApiKey] = useState('');
    const [browserSources, setBrowserSources] = useState<BrowserSource[]>([]);
    const [blacklistDomains, setBlacklistDomains] = useState<string[]>([]);
    const [embeddingModel, setEmbeddingModel] = useState('text-embedding-3-small');
    const [embeddingProvider, setEmbeddingProvider] = useState('realtimexai');
    const [embeddingBaseUrl, setEmbeddingBaseUrl] = useState('');
    const [embeddingApiKey, setEmbeddingApiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingBrowser, setIsSavingBrowser] = useState(false);
    const [isSavingBlacklist, setIsSavingBlacklist] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    // SDK state
    const [sdkAvailable, setSdkAvailable] = useState(false);
    const [sdkProviders, setSdkProviders] = useState<any>(null);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [availableLLMModels, setAvailableLLMModels] = useState<string[]>([]);

    useEffect(() => {
        fetchSettings();
        fetchSDKProviders();
    }, []);

    const fetchSettings = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('alchemy_settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (data) {
            setBaseUrl(data.llm_base_url || data.ollama_host || 'http://localhost:11434');
            setModelName(data.llm_model_name || 'llama3');
            setLlmProvider(data.llm_provider || 'realtimexai');
            setLlmModel(data.llm_model || 'gpt-4o');
            setApiKey(data.llm_api_key || data.openai_api_key || data.anthropic_api_key || '');
            setBrowserSources(data.custom_browser_paths || []);
            setBlacklistDomains(data.blacklist_domains || []);
            setEmbeddingModel(data.embedding_model || 'text-embedding-3-small');
            setEmbeddingProvider(data.embedding_provider || 'realtimexai');
            setEmbeddingBaseUrl(data.embedding_base_url || '');
            setEmbeddingApiKey(data.embedding_api_key || '');
        }
    };

    const fetchSDKProviders = async () => {
        try {
            // Fetch both chat and embed providers from RealTimeX SDK (new API)
            const [chatResponse, embedResponse] = await Promise.all([
                axios.get('http://localhost:3001/sdk/llm/providers/chat', { timeout: 2000 }),
                axios.get('http://localhost:3001/sdk/llm/providers/embed', { timeout: 2000 })
            ]);

            if (chatResponse.data.success && embedResponse.data.success) {
                setSdkProviders({
                    chat: chatResponse.data.providers,
                    embed: embedResponse.data.providers
                });
                setSdkAvailable(true);

                // Initialize models for default provider
                updateAvailableLLMModels('realtimexai', chatResponse.data.providers);
                updateAvailableModels('realtimexai', embedResponse.data.providers);

                console.log('[AlchemistEngine] SDK providers loaded');
                console.log('  Chat providers:', chatResponse.data.providers.map((p: any) => p.provider));
                console.log('  Embed providers:', embedResponse.data.providers.map((p: any) => p.provider));
            }
        } catch (error) {
            console.log('[AlchemistEngine] SDK not available, using hardcoded configuration');
            setSdkAvailable(false);
        }
    };

    const updateAvailableModels = (provider: string, providersData: any) => {
        // Use SDK-provided embedding models if available
        if (providersData && Array.isArray(providersData)) {
            const providerData = providersData.find((p: any) => p.provider === provider);
            if (providerData && providerData.models) {
                const modelIds = providerData.models.map((m: any) => m.id);
                console.log(`[AlchemistEngine] Using SDK embedding models for ${provider}:`, modelIds);
                setAvailableModels(modelIds);
                return;
            }
        }

        // Fallback to hardcoded embedding models
        console.log(`[AlchemistEngine] Using hardcoded embedding models for ${provider}`);
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
                console.log(`[AlchemistEngine] Using SDK chat models for ${provider}:`, modelIds);
                setAvailableLLMModels(modelIds);
                return;
            }
        }

        // Fallback to hardcoded models if SDK not available
        console.log(`[AlchemistEngine] Using hardcoded chat models for ${provider}`);
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
                showToast('Please log in to save settings', 'error');
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
                        llm_base_url: baseUrl,
                        llm_model_name: modelName,
                        llm_api_key: apiKey,
                        embedding_model: embeddingModel,
                        embedding_provider: embeddingProvider,
                        embedding_base_url: embeddingBaseUrl,
                        embedding_api_key: embeddingApiKey
                    },
                    {
                        onConflict: 'user_id'
                    }
                );

            if (error) {
                console.error('[AlchemistEngine] Save error:', error);
                showToast(`Failed to save: ${error.message}`, 'error');
            } else {
                showToast('LLM settings saved successfully', 'success');
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
                showToast('Please log in to save settings', 'error');
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
                showToast(`Failed to save: ${error.message}`, 'error');
            } else {
                showToast('Browser sources saved successfully', 'success');
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
                showToast('Please log in to save settings', 'error');
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
                showToast(`Failed to save: ${error.message}`, 'error');
            } else {
                showToast('Blacklist updated successfully', 'success');
                await fetchSettings(); // Refresh settings
            }
        } catch (err: any) {
            console.error('[AlchemistEngine] Unexpected error:', err);
            showToast(`Unexpected error: ${err.message}`, 'error');
        } finally {
            setIsSavingBlacklist(false);
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
                showToast(`Connection successful! ${data.model ? `Model: ${data.model}` : ''}`, 'success');
            } else {
                showToast(`Connection failed: ${data.message}`, 'error');
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
                <h2 className="text-2xl font-bold tracking-tight">Intelligence Engine</h2>
                <p className="text-sm text-fg/50 font-medium">Fine-tune the Alchemist's cognitive parameters and provider links.</p>
            </header>

            <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {/* AI Configuration - Unified section spanning both columns */}
                    <section className="space-y-6 mb-8">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-widest text-fg/40 flex items-center gap-2">
                                <Cpu size={14} /> AI Configuration
                            </label>
                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleTestConnection}
                                    disabled={isTesting || isSaving}
                                    className="px-6 py-3 bg-surface hover:bg-surface/80 border border-border text-fg font-bold rounded-xl shadow-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                                >
                                    {isTesting ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} className="text-accent" />}
                                    Test Connection
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg glow-primary hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                                >
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    Save Configuration
                                </button>
                            </div>
                        </div>

                        {/* 2-column grid for LLM and Embedding */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* LLM Provider */}
                            <div className="glass p-6 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-fg/80">LLM Provider</h3>
                                    {sdkAvailable ? (
                                        <span className="text-xs text-green-500 flex items-center gap-1">
                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                            SDK Connected
                                        </span>
                                    ) : (
                                        <span className="text-xs text-orange-500 flex items-center gap-1">
                                            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                            SDK Not Available
                                        </span>
                                    )}
                                </div>

                                {/* Provider Dropdown */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-fg/60">Provider</label>
                                    <select
                                        value={llmProvider}
                                        onChange={(e) => {
                                            setLlmProvider(e.target.value);
                                            updateAvailableLLMModels(e.target.value, sdkProviders);
                                        }}
                                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-fg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        <option value="realtimexai">RealTimeX.AI</option>
                                        <option value="openai">OpenAI</option>
                                        <option value="anthropic">Anthropic</option>
                                        <option value="google">Google</option>
                                        <option value="ollama">Ollama</option>
                                    </select>
                                </div>

                                {/* Model Dropdown */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-fg/60">Intelligence Model</label>
                                    <select
                                        value={llmModel}
                                        onChange={(e) => setLlmModel(e.target.value)}
                                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-fg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
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
                                            ? '✓ Using RealTimeX configured provider'
                                            : '⚠️ RealTimeX SDK not detected. Configure in RealTimeX Desktop.'}
                                    </p>
                                </div>
                            </div>

                            {/* Embedding Provider */}
                            <div className="glass p-6 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-fg/80">Embedding Provider</h3>
                                    {sdkAvailable ? (
                                        <span className="text-xs text-green-500 flex items-center gap-1">
                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                            SDK Connected
                                        </span>
                                    ) : (
                                        <span className="text-xs text-orange-500 flex items-center gap-1">
                                            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                            SDK Not Available
                                        </span>
                                    )}
                                </div>

                                {/* Provider Dropdown */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-fg/60">Provider</label>
                                    <select
                                        value={embeddingProvider}
                                        onChange={(e) => {
                                            setEmbeddingProvider(e.target.value);
                                            updateAvailableModels(e.target.value, sdkProviders);
                                        }}
                                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-fg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        <option value="realtimexai">RealTimeX.AI</option>
                                        <option value="openai">OpenAI</option>
                                        <option value="gemini">Gemini</option>
                                    </select>
                                </div>

                                {/* Model Dropdown */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-fg/60">Embedding Model</label>
                                    <select
                                        value={embeddingModel}
                                        onChange={(e) => setEmbeddingModel(e.target.value)}
                                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-fg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
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
                                            ? '✓ Embeddings are generated using your RealTimeX configured provider'
                                            : '⚠️ RealTimeX SDK not detected. Configure providers in RealTimeX Desktop.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 2-column grid for Browser Sources and Blacklist */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Browser History Sources */}
                        <section className="space-y-6">
                            <div className="space-y-4">
                                <label className="text-xs font-bold uppercase tracking-widest text-fg/40 flex items-center gap-2">
                                    <Database size={14} /> Browser History Sources
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
                                            className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg glow-primary hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                                        >
                                            {isSavingBrowser ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                            Save Browser Sources
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Blacklist Domains */}
                        <section className="space-y-6">
                            <div className="space-y-4">
                                <label className="text-xs font-bold uppercase tracking-widest text-fg/40 flex items-center gap-2">
                                    <Zap size={14} /> Blacklist Domains
                                </label>

                                <div className="glass p-8 space-y-6">
                                    <div className="space-y-2">
                                        <p className="text-sm text-fg/60">
                                            URLs containing these patterns will be skipped during mining. Enter one pattern per line.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">
                                            Domain Patterns (one per line)
                                        </label>
                                        <textarea
                                            value={blacklistDomains.join('\n')}
                                            onChange={(e) => setBlacklistDomains(
                                                e.target.value.split('\n').map(d => d.trim())
                                            )}
                                            placeholder="google.com/search&#10;localhost:&#10;127.0.0.1&#10;facebook.com&#10;twitter.com&#10;instagram.com&#10;linkedin.com/feed"
                                            className="w-full h-40 px-4 py-3 rounded-xl border border-border bg-surface text-fg text-sm placeholder:text-fg/40 focus:outline-none focus:border-[var(--border-hover)] transition-all resize-none"
                                        />
                                        <p className="text-xs text-fg/50 ml-1">
                                            Examples: google.com/search, localhost:, facebook.com, twitter.com
                                        </p>
                                    </div>

                                    {/* Save Button */}
                                    <div className="flex justify-end pt-2">
                                        <button
                                            onClick={handleSaveBlacklist}
                                            disabled={isSavingBlacklist}
                                            className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg glow-primary hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                                        >
                                            {isSavingBlacklist ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                            Save Blacklist
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
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

