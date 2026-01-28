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
import { useTranslation } from 'react-i18next';
import {
    saveSupabaseConfig,
    validateSupabaseConnection,
} from '../lib/supabase-config';
import { LanguageSwitcher } from './LanguageSwitcher';

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
    const { t } = useTranslation();
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
            setError(result.error || t('common.error'));
            setStep('credentials');
            setLoading(false);
        }
    };

    const handleRunMigration = async () => {
        if (!projectId) {
            setError(t('setup.project_id_required'));
            return;
        }

        if (!accessToken) {
            setError(t('setup.access_token_required'));
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
                throw new Error(t('setup.stream_error'));
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
                                setError(t('setup.migration_failed_logs'));
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
                className="w-full max-w-xl glass p-12 space-y-10 relative"
            >
                <div className="absolute top-4 right-4 z-50">
                    <LanguageSwitcher position="bottom" />
                </div>
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

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
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-black italic tracking-tighter uppercase">{t('setup.welcome_title')}</h2>
                                    </div>
                                </div>
                                <p className="text-sm text-fg/50 font-medium">
                                    {t('setup.welcome_desc')}
                                </p>
                            </div>

                            <div className="glass bg-white/5 border-white/10 p-4 rounded-xl space-y-3">
                                <p className="text-xs font-bold uppercase tracking-widest text-primary/70">{t('setup.requirements')}</p>
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-sm text-fg/60">
                                        <Check className="w-4 h-4 text-emerald-500" /> {t('setup.project_url')}
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-fg/60">
                                        <Check className="w-4 h-4 text-emerald-500" /> {t('setup.anon_key')}
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-fg/60">
                                        <Check className="w-4 h-4 text-emerald-500" /> {t('account.credentials')}
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
                                    {t('setup.forge_project')} <ExternalLink size={14} />
                                </a>
                                <button
                                    onClick={() => setStep('credentials')}
                                    className="w-full py-4 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg glow-primary hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {t('setup.begin_init')} <ArrowRight size={18} />
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
                                <h2 className="text-2xl font-black italic tracking-tighter uppercase">{t('setup.credentials_title')}</h2>
                                <p className="text-sm text-fg/50 font-medium lowercase">{t('setup.credentials_desc')}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">{t('setup.project_url')}</label>
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        className="w-full bg-black/20 border border-border/20 rounded-xl py-3 px-4 text-sm focus:border-primary/50 outline-none transition-all"
                                        placeholder={t('setup.project_url_placeholder')}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">{t('setup.anon_key')}</label>
                                    <input
                                        type="password"
                                        value={anonKey}
                                        onChange={(e) => setAnonKey(e.target.value)}
                                        className="w-full bg-black/20 border border-border/20 rounded-xl py-3 px-4 text-sm focus:border-primary/50 outline-none transition-all"
                                        placeholder={t('setup.anon_key_placeholder')}
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
                                    {t('common.back')}
                                </button>
                                <button
                                    onClick={handleValidateAndSave}
                                    disabled={!url || !anonKey}
                                    className="flex-[2] py-4 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg glow-primary hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                                >
                                    {t('setup.connect_essence')} <Zap size={18} />
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
                                <h3 className="text-xl font-bold italic uppercase tracking-tighter">{t('setup.validating')}</h3>
                                <p className="text-sm text-fg/40 font-mono tracking-widest uppercase animate-pulse">{t('setup.resonance')}</p>
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
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-black italic tracking-tighter uppercase">{t('setup.init_schema')}</h2>
                                    </div>
                                </div>
                                <p className="text-sm text-fg/50 font-medium">
                                    {t('setup.schema_desc')}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">{t('setup.project_id')}</label>
                                    <input
                                        type="text"
                                        value={projectId}
                                        onChange={(e) => setProjectId(e.target.value)}
                                        className="w-full bg-black/20 border border-border/20 rounded-xl py-3 px-4 text-sm focus:border-primary/50 outline-none transition-all font-mono"
                                        placeholder={t('setup.project_id_placeholder')}
                                    />
                                    <p className="text-[10px] text-fg/30 ml-1">{t('setup.project_id_help')}</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">{t('setup.access_token')}</label>
                                    <input
                                        type="password"
                                        value={accessToken}
                                        onChange={(e) => setAccessToken(e.target.value)}
                                        className="w-full bg-black/20 border border-border/20 rounded-xl py-3 px-4 text-sm focus:border-primary/50 outline-none transition-all font-mono"
                                        placeholder={t('setup.access_token_placeholder')}
                                    />
                                    <p className="text-[10px] text-fg/30 ml-1">
                                        Generate at{' '}
                                        <a
                                            href="https://supabase.com/dashboard/account/tokens"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-accent hover:underline"
                                        >
                                            {t('setup.access_token_link')}
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
                                    {t('common.skip')}
                                </button>
                                <button
                                    onClick={handleRunMigration}
                                    disabled={!projectId || !accessToken}
                                    className="flex-[2] py-4 bg-gradient-to-r from-accent to-primary text-white font-bold rounded-xl shadow-lg glow-accent hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                                >
                                    <Play size={18} /> {t('setup.run_migrations')}
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
                                    <h2 className="text-xl font-black italic tracking-tighter uppercase">{t('setup.running_migrations')}</h2>
                                </div>
                                <p className="text-sm text-fg/40">{t('setup.take_minute')}</p>
                            </div>

                            {/* Log Output */}
                            <div className="bg-black/40 border border-border/20 rounded-xl p-4 h-64 overflow-y-auto font-mono text-xs">
                                {migrationLogs.map((log, i) => (
                                    <div
                                        key={i}
                                        className={`py-0.5 ${log.includes('✅') || log.includes('SUCCESS') ? 'text-emerald-400' :
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
                                        <ArrowLeft size={14} className="inline mr-2" /> {t('setup.back')}
                                    </button>
                                    <button
                                        onClick={handleRunMigration}
                                        className="flex-1 py-3 bg-accent/20 border border-accent/30 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-accent/30 transition-all text-accent"
                                    >
                                        {t('setup.retry')}
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
                                <h3 className="text-2xl font-black italic uppercase tracking-tighter">{t('setup.engine_aligned')}</h3>
                                <p className="text-sm text-fg/40 font-mono tracking-widest uppercase">{t('setup.restarting')}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
