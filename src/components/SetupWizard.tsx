import { useState, useRef, useEffect } from 'react';
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
    ArrowLeft,
    Terminal,
    Play
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import {
    saveSupabaseConfig,
    validateSupabaseConnection,
} from '../lib/supabase-config';

type WizardStep = 'welcome' | 'credentials' | 'validating' | 'migration' | 'migrating' | 'success';

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

function extractProjectId(url: string): string {
    // Extract project ID from URL like https://abcdefgh.supabase.co
    const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/);
    return match ? match[1] : '';
}

export function SetupWizard({ onComplete, open = true, canClose = false }: SetupWizardProps) {
    const [step, setStep] = useState<WizardStep>('welcome');
    const [url, setUrl] = useState('');
    const [anonKey, setAnonKey] = useState('');
    const [projectId, setProjectId] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
    const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [migrationLogs]);

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

            // Check if migrations are needed by querying init_state
            try {
                const tempClient = createClient(normalizedUrl, trimmedKey);
                const { data, error: initError } = await tempClient
                    .from('init_state')
                    .select('is_initialized')
                    .single();

                if (!initError && data && data.is_initialized > 0) {
                    // Database is already set up, skip migration
                    setStep('success');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                    return;
                }
            } catch (e) {
                // Error checking init_state - likely needs migration
                console.log('[SetupWizard] init_state check failed, showing migration step');
            }

            // Extract project ID for migration step
            const extractedId = extractProjectId(normalizedUrl);
            setProjectId(extractedId);
            setStep('migration');
            setLoading(false);
        } else {
            setError(result.error || 'Connection failed');
            setStep('credentials');
            setLoading(false);
        }
    };

    const handleRunMigration = async () => {
        if (!projectId) {
            setError('Project ID is required');
            return;
        }

        if (!accessToken) {
            setError('Access token is required');
            return;
        }

        setError(null);
        setMigrationLogs([]);
        setMigrationStatus('running');
        setStep('migrating');

        try {
            const response = await fetch('/api/migrate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, accessToken })
            });

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('Failed to read migration stream');
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.type === 'done') {
                            if (data.data === 'success') {
                                setMigrationStatus('success');
                                setStep('success');
                                setTimeout(() => {
                                    window.location.reload();
                                }, 2000);
                            } else {
                                setMigrationStatus('failed');
                                setError('Migration failed. Check logs for details.');
                            }
                        } else {
                            setMigrationLogs(prev => [...prev, data.data]);
                        }
                    } catch (e) {
                        // Ignore parse errors for incomplete chunks
                    }
                }
            }
        } catch (err: any) {
            setMigrationStatus('failed');
            setError(err.message || 'Migration failed');
            setMigrationLogs(prev => [...prev, `Error: ${err.message}`]);
        }
    };

    const handleSkipMigration = () => {
        setStep('success');
        setTimeout(() => {
            window.location.reload();
        }, 1500);
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
                                    <li className="flex items-center gap-2 text-sm text-fg/60">
                                        <Check className="w-4 h-4 text-emerald-500" /> Access Token (for migrations)
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

                    {step === 'migration' && (
                        <motion.div
                            key="migration"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-accent/10 rounded-xl">
                                        <Terminal className="w-6 h-6 text-accent" />
                                    </div>
                                    <h2 className="text-2xl font-black italic tracking-tighter uppercase">Initialize Schema</h2>
                                </div>
                                <p className="text-sm text-fg/50 font-medium">
                                    Run database migrations to set up required tables and functions.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">Project ID</label>
                                    <input
                                        type="text"
                                        value={projectId}
                                        onChange={(e) => setProjectId(e.target.value)}
                                        className="w-full bg-black/20 border border-border/20 rounded-xl py-3 px-4 text-sm focus:border-primary/50 outline-none transition-all font-mono"
                                        placeholder="abcdefghijklm"
                                    />
                                    <p className="text-[10px] text-fg/30 ml-1">Found in Supabase Dashboard → Project Settings → General</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">Access Token</label>
                                    <input
                                        type="password"
                                        value={accessToken}
                                        onChange={(e) => setAccessToken(e.target.value)}
                                        className="w-full bg-black/20 border border-border/20 rounded-xl py-3 px-4 text-sm focus:border-primary/50 outline-none transition-all font-mono"
                                        placeholder="sbp_..."
                                    />
                                    <p className="text-[10px] text-fg/30 ml-1">
                                        Generate at{' '}
                                        <a
                                            href="https://supabase.com/dashboard/account/tokens"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-accent hover:underline"
                                        >
                                            supabase.com/dashboard/account/tokens
                                        </a>
                                    </p>
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
                                    onClick={handleSkipMigration}
                                    className="flex-1 py-4 border border-border/20 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all text-fg/40"
                                >
                                    SKIP
                                </button>
                                <button
                                    onClick={handleRunMigration}
                                    disabled={!projectId || !accessToken}
                                    className="flex-[2] py-4 bg-gradient-to-r from-accent to-primary text-white font-bold rounded-xl shadow-lg glow-accent hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                                >
                                    <Play size={18} /> RUN MIGRATIONS
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 'migrating' && (
                        <motion.div
                            key="migrating"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                                    <h2 className="text-xl font-black italic tracking-tighter uppercase">Running Migrations</h2>
                                </div>
                                <p className="text-sm text-fg/40">This may take a minute...</p>
                            </div>

                            {/* Log Output */}
                            <div className="bg-black/40 border border-border/20 rounded-xl p-4 h-64 overflow-y-auto font-mono text-xs">
                                {migrationLogs.map((log, i) => (
                                    <div
                                        key={i}
                                        className={`py-0.5 ${
                                            log.includes('✅') || log.includes('SUCCESS') ? 'text-emerald-400' :
                                            log.includes('❌') || log.includes('Error') ? 'text-red-400' :
                                            log.includes('⚠️') ? 'text-amber-400' :
                                            'text-fg/60'
                                        }`}
                                    >
                                        {log}
                                    </div>
                                ))}
                                <div ref={logsEndRef} />
                            </div>

                            {migrationStatus === 'failed' && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setStep('migration')}
                                        className="flex-1 py-3 border border-border/20 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all text-fg/40"
                                    >
                                        <ArrowLeft size={14} className="inline mr-2" /> BACK
                                    </button>
                                    <button
                                        onClick={handleRunMigration}
                                        className="flex-1 py-3 bg-accent/20 border border-accent/30 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-accent/30 transition-all text-accent"
                                    >
                                        RETRY
                                    </button>
                                </div>
                            )}
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
