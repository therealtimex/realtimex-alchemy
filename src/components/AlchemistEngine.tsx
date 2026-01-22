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
    const [apiKey, setApiKey] = useState('');
    const [browserSources, setBrowserSources] = useState<BrowserSource[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingBrowser, setIsSavingBrowser] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    useEffect(() => {
        fetchSettings();
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
            setApiKey(data.llm_api_key || data.openai_api_key || data.anthropic_api_key || '');
            setBrowserSources(data.custom_browser_paths || []);
        }
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
                        llm_base_url: baseUrl,
                        llm_model_name: modelName,
                        llm_api_key: apiKey
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
                <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <section className="space-y-6">
                        <div className="space-y-4">
                            <label className="text-xs font-bold uppercase tracking-widest text-fg/40 flex items-center gap-2">
                                <Cpu size={14} /> LLM Configuration
                            </label>


                            <div className="glass p-8 space-y-6">
                                <InputGroup
                                    label="Provider URL (Base)"
                                    value={baseUrl}
                                    onChange={setBaseUrl}
                                    placeholder="http://localhost:11434 or https://api.openai.com/v1"
                                />

                                <InputGroup
                                    label="Intelligence Model"
                                    value={modelName}
                                    onChange={setModelName}
                                    placeholder="llama3, gpt-4o, claude-3-5-sonnet..."
                                />

                                <InputGroup
                                    label="Secret Key (Optional)"
                                    type="password"
                                    value={apiKey}
                                    onChange={setApiKey}
                                    placeholder="sk-..."
                                />

                                <div className="p-4 bg-primary/5 rounded-2xl">
                                    <p className="text-[10px] text-primary/60 font-medium leading-relaxed">
                                        The Alchemist uses a unified interface. You can point this to local Ollama instances,
                                        OpenAI-compatible APIs, or any custom LLM endpoint.
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-3 pt-2">
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
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

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

