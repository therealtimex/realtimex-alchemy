import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Database,
    CheckCircle,
    AlertCircle,
    ExternalLink,
    Check,
    Loader2,
    Zap,
    ArrowRight,
    ArrowLeft
} from 'lucide-react';
import {
    saveSupabaseConfig,
    validateSupabaseConnection,
} from '../lib/supabase-config';

type WizardStep = 'welcome' | 'credentials' | 'validating' | 'success';

interface SetupWizardProps {
    onComplete: () => void;
    open?: boolean;
    canClose?: boolean;
}

function normalizeSupabaseUrl(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    return `https://${trimmed}.supabase.co`;
}

export function SetupWizard({ onComplete, open = true, canClose = false }: SetupWizardProps) {
    const [step, setStep] = useState<WizardStep>('welcome');
    const [url, setUrl] = useState('');
    const [anonKey, setAnonKey] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    if (!open) return null;

    const handleValidateAndSave = async () => {
        setError(null);
        setLoading(true);
        setStep('validating');

        const normalizedUrl = normalizeSupabaseUrl(url);
        const trimmedKey = anonKey.trim();

        const result = await validateSupabaseConnection(normalizedUrl, trimmedKey);

        if (result.valid) {
            saveSupabaseConfig({ url: normalizedUrl, anonKey: trimmedKey });
            setStep('success');
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            setError(result.error || 'Connection failed');
            setStep('credentials');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-bg/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg glass p-8 space-y-8 relative overflow-hidden"
            >
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <AnimatePresence mode="wait">
                    {step === 'welcome' && (
                        <motion.div
                            key="welcome"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-xl">
                                        <Database className="w-6 h-6 text-primary" />
                                    </div>
                                    <h2 className="text-2xl font-black italic tracking-tighter uppercase">Assemble Your Engine</h2>
                                </div>
                                <p className="text-sm text-fg/50 font-medium">
                                    Alchemy requires a Supabase essence to store signal fragments and intelligence patterns.
                                </p>
                            </div>

                            <div className="glass bg-white/5 border-white/10 p-4 rounded-xl space-y-3">
                                <p className="text-xs font-bold uppercase tracking-widest text-primary/70">Requirements:</p>
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-sm text-fg/60">
                                        <Check className="w-4 h-4 text-emerald-500" /> Supabase Project URL
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-fg/60">
                                        <Check className="w-4 h-4 text-emerald-500" /> Anon Public API Key
                                    </li>
                                </ul>
                            </div>

                            <div className="flex flex-col gap-3">
                                <a
                                    href="https://supabase.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 py-3 border border-border/20 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all text-fg/60"
                                >
                                    Forge Project at Supabase <ExternalLink size={14} />
                                </a>
                                <button
                                    onClick={() => setStep('credentials')}
                                    className="w-full py-4 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg glow-primary hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    BEGIN INITIALIZATION <ArrowRight size={18} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 'credentials' && (
                        <motion.div
                            key="credentials"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black italic tracking-tighter uppercase">Essence Coordinates</h2>
                                <p className="text-sm text-fg/50 font-medium lowercase">Link the alchemist engine to your cloud database</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">Project URL or ID</label>
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        className="w-full bg-black/20 border border-border/20 rounded-xl py-3 px-4 text-sm focus:border-primary/50 outline-none transition-all"
                                        placeholder="https://xxx.supabase.co or project-id"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">Anon Public Key</label>
                                    <input
                                        type="password"
                                        value={anonKey}
                                        onChange={(e) => setAnonKey(e.target.value)}
                                        className="w-full bg-black/20 border border-border/20 rounded-xl py-3 px-4 text-sm focus:border-primary/50 outline-none transition-all"
                                        placeholder="eyJ..."
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="bg-error/10 border border-error/20 p-3 rounded-xl flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5 text-error" />
                                    <p className="text-xs text-error font-bold tracking-tight">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('welcome')}
                                    className="flex-1 py-4 border border-border/20 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all text-fg/40"
                                >
                                    BACK
                                </button>
                                <button
                                    onClick={handleValidateAndSave}
                                    disabled={!url || !anonKey}
                                    className="flex-[2] py-4 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg glow-primary hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                                >
                                    CONNECT ESSENCE <Zap size={18} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 'validating' && (
                        <motion.div
                            key="validating"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-12 space-y-6"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                                <Loader2 className="w-16 h-16 animate-spin text-primary relative z-10" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-bold italic uppercase tracking-tighter">Validating Link</h3>
                                <p className="text-sm text-fg/40 font-mono tracking-widest uppercase animate-pulse">Synchronizing Resonance...</p>
                            </div>
                        </motion.div>
                    )}

                    {step === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-12 space-y-6"
                        >
                            <div className="p-4 bg-emerald-500/20 rounded-full">
                                <CheckCircle className="w-16 h-16 text-emerald-500" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-black italic uppercase tracking-tighter">Engine Aligned</h3>
                                <p className="text-sm text-fg/40 font-mono tracking-widest uppercase">Restarting Alchemist Subsystems...</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
