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
    Play,
    Eye,
    EyeOff
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import {
    saveSupabaseConfig,
    validateSupabaseConnection,
} from '../lib/supabase-config';
import { LanguageSwitcher } from './LanguageSwitcher';

type WizardStep = 'welcome' | 'type-selection' | 'quick-setup' | 'credentials' | 'validating' | 'provisioning' | 'migration' | 'migrating' | 'success';

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
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [selectedOrgId, setSelectedOrgId] = useState('');
    const [isFetchingOrgs, setIsFetchingOrgs] = useState(false);
    const [provisioningLogs, setProvisioningLogs] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [customProjectName, setCustomProjectName] = useState('Alchemy Engine');
    const [selectedRegion, setSelectedRegion] = useState('us-east-1');
    const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
    const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
    const [showAccessToken, setShowAccessToken] = useState(false);
    const [showAnonKey, setShowAnonKey] = useState(false);
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

    const handleFetchOrgs = async () => {
        if (!accessToken) return;
        setIsFetchingOrgs(true);
        setError(null);
        try {
            const response = await fetch('/api/setup/organizations', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const data = await response.json();
            if (response.ok) {
                setOrganizations(data);
                if (data.length > 0) setSelectedOrgId(data[0].id);
            } else {
                setError(data.error || 'Failed to fetch organizations');
            }
        } catch (err: any) {
            setError(err.message || 'Connection error');
        } finally {
            setIsFetchingOrgs(false);
        }
    };

    const handleAutoProvision = async () => {
        if (!selectedOrgId || !accessToken) return;

        setError(null);
        setProvisioningLogs([]);
        setStep('provisioning');

        try {
            const response = await fetch('/api/setup/auto-provision', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    orgId: selectedOrgId,
                    projectName: customProjectName,
                    region: selectedRegion
                })
            });

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error('Stream error');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const events = chunk.split('\n\n'); // SSE events are separated by double newlines

                for (const event of events) {
                    if (!event.trim()) continue;

                    const dataLine = event.split('\n').find(l => l.startsWith('data: '));
                    if (!dataLine) continue;

                    try {
                        const data = JSON.parse(dataLine.slice(6));
                        if (data.type === 'success') {
                            const { url, anonKey, projectId: newProjectId } = data.data;
                            setUrl(url);
                            setAnonKey(anonKey);
                            setProjectId(newProjectId);
                            saveSupabaseConfig({ url, anonKey });

                            // Automatically start migration using the fresh credentials
                            setTimeout(() => {
                                handleRunMigration(newProjectId, accessToken);
                            }, 500);
                            return;
                        } else if (data.type === 'error') {
                            setError(data.data);
                            setStep('quick-setup');
                            return;
                        } else {
                            setProvisioningLogs(prev => [...prev, data.data]);
                        }
                    } catch (e) { }
                }
            }
        } catch (err: any) {
            setError(err.message || 'Auto-provisioning failed');
            setStep('quick-setup');
        }
    };

    const handleRunMigration = async (overrideProjectId?: string, overrideToken?: string) => {
        const targetProjectId = overrideProjectId || projectId;
        const targetToken = overrideToken || accessToken;

        if (!targetProjectId) {
            setError(t('setup.project_id_required'));
            return;
        }

        if (!targetToken) {
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
                body: JSON.stringify({
                    projectId: targetProjectId,
                    accessToken: targetToken
                })
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
                                    onClick={() => setStep('type-selection')}
                                    className="w-full py-4 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg glow-primary hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {t('setup.begin_init')} <ArrowRight size={18} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 'type-selection' && (
                        <motion.div
                            key="type-selection"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="space-y-2 text-center mb-8">
                                <h2 className="text-2xl font-black italic tracking-tighter uppercase">{t('setup.choose_setup_path')}</h2>
                                <p className="text-sm text-fg/50 font-medium lowercase">{t('setup.forge_how')}</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <button
                                    onClick={() => setStep('quick-setup')}
                                    className="group relative p-6 glass bg-primary/5 border-primary/20 hover:border-primary/50 text-left transition-all rounded-2xl"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
                                            <Zap className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold uppercase tracking-tight">{t('setup.quick_launch')}</h3>
                                            <p className="text-sm text-fg/50 font-medium">{t('setup.quick_launch_desc')}</p>
                                        </div>
                                    </div>
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                                        <ArrowRight className="w-5 h-5 text-primary" />
                                    </div>
                                </button>

                                <button
                                    onClick={() => setStep('credentials')}
                                    className="group relative p-6 glass bg-white/5 border-white/10 hover:border-white/30 text-left transition-all rounded-2xl"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-white/5 rounded-xl group-hover:scale-110 transition-transform">
                                            <Database className="w-6 h-6 text-fg/50" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold uppercase tracking-tight">{t('setup.manual_connection')}</h3>
                                            <p className="text-sm text-fg/50 font-medium lowercase">{t('setup.manual_connection_desc')}</p>
                                        </div>
                                    </div>
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                                        <ArrowRight className="w-5 h-5 text-fg/30" />
                                    </div>
                                </button>
                            </div>

                            <button
                                onClick={() => setStep('welcome')}
                                className="w-full py-4 text-xs font-bold uppercase tracking-widest text-fg/30 hover:text-fg/60 transition-colors"
                            >
                                {t('common.back')}
                            </button>
                        </motion.div>
                    )}

                    {step === 'quick-setup' && (
                        <motion.div
                            key="quick-setup"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black italic tracking-tighter uppercase">{t('setup.quick_launch')}</h2>
                                <p className="text-sm text-fg/50 font-medium lowercase">{t('setup.quick_provision_desc')}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-bold uppercase text-fg/30">{t('setup.access_token')}</label>
                                        <a
                                            href="https://supabase.com/dashboard/account/tokens"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-primary hover:underline font-bold"
                                        >
                                            {t('setup.get_token')} <ExternalLink size={10} className="inline ml-1" />
                                        </a>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showAccessToken ? "text" : "password"}
                                            value={accessToken}
                                            onChange={(e) => setAccessToken(e.target.value)}
                                            onBlur={handleFetchOrgs}
                                            className="w-full bg-black/20 border border-border/20 rounded-xl py-3 pl-4 pr-12 text-sm focus:border-primary/50 outline-none transition-all font-mono"
                                            placeholder="sbp_..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowAccessToken(!showAccessToken)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg/20 hover:text-fg/50 transition-colors"
                                        >
                                            {showAccessToken ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {organizations.length > 0 && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">{t('setup.project_name')}</label>
                                            <input
                                                type="text"
                                                value={customProjectName}
                                                onChange={(e) => setCustomProjectName(e.target.value)}
                                                className="w-full bg-black/20 border border-border/20 rounded-xl py-3 px-4 text-sm focus:border-primary/50 outline-none transition-all"
                                                placeholder={t('setup.project_name_placeholder')}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">{t('setup.organization')}</label>
                                                <select
                                                    value={selectedOrgId}
                                                    onChange={(e) => setSelectedOrgId(e.target.value)}
                                                    className="w-full bg-black/20 border border-border/20 rounded-xl py-3 px-4 text-sm focus:border-primary/50 outline-none transition-all appearance-none"
                                                >
                                                    {organizations.map(org => (
                                                        <option key={org.id} value={org.id}>{org.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">{t('setup.region')}</label>
                                                <select
                                                    value={selectedRegion}
                                                    onChange={(e) => setSelectedRegion(e.target.value)}
                                                    className="w-full bg-black/20 border border-border/20 rounded-xl py-3 px-4 text-sm focus:border-primary/50 outline-none transition-all appearance-none"
                                                >
                                                    <option value="us-east-1">{t('setup.regions.us-east-1')}</option>
                                                    <option value="us-west-1">{t('setup.regions.us-west-1')}</option>
                                                    <option value="eu-central-1">{t('setup.regions.eu-central-1')}</option>
                                                    <option value="eu-west-2">{t('setup.regions.eu-west-2')}</option>
                                                    <option value="ap-southeast-1">{t('setup.regions.ap-southeast-1')}</option>
                                                    <option value="ap-southeast-2">{t('setup.regions.ap-southeast-2')}</option>
                                                    <option value="sa-east-1">{t('setup.regions.sa-east-1')}</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="bg-error/10 border border-error/20 p-3 rounded-xl flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5 text-error" />
                                    <p className="text-xs text-error font-bold tracking-tight">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('type-selection')}
                                    className="flex-1 py-4 border border-border/20 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all text-fg/40"
                                >
                                    {t('common.back')}
                                </button>
                                <button
                                    onClick={handleAutoProvision}
                                    disabled={!accessToken || !selectedOrgId || isFetchingOrgs}
                                    className="flex-[2] py-4 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg glow-primary hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                                >
                                    {isFetchingOrgs ? <Loader2 className="animate-spin w-5 h-5" /> : <Play size={18} />}
                                    {t('setup.launch_engine')}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 'provisioning' && (
                        <motion.div
                            key="provisioning"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                    <h2 className="text-xl font-black italic tracking-tighter uppercase">{t('setup.provisioning_forge')}</h2>
                                </div>
                                <p className="text-sm text-fg/40 lowercase">{t('setup.building_instance')}</p>
                            </div>

                            <div className="bg-black/40 border border-primary/10 rounded-xl p-4 h-64 overflow-y-auto font-mono text-xs">
                                {provisioningLogs.map((log, i) => (
                                    <div key={i} className="py-0.5 text-fg/60 animate-in fade-in slide-in-from-left-2 duration-300">
                                        {log}
                                    </div>
                                ))}
                                <div ref={logsEndRef} />
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
                                    <div className="relative">
                                        <input
                                            type={showAnonKey ? "text" : "password"}
                                            value={anonKey}
                                            onChange={(e) => setAnonKey(e.target.value)}
                                            className="w-full bg-black/20 border border-border/20 rounded-xl py-3 pl-4 pr-12 text-sm focus:border-primary/50 outline-none transition-all font-mono"
                                            placeholder={t('setup.anon_key_placeholder')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowAnonKey(!showAnonKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg/20 hover:text-fg/50 transition-colors"
                                        >
                                            {showAnonKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
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
                                    <div className="relative">
                                        <input
                                            type={showAccessToken ? "text" : "password"}
                                            value={accessToken}
                                            onChange={(e) => setAccessToken(e.target.value)}
                                            className="w-full bg-black/20 border border-border/20 rounded-xl py-3 pl-4 pr-12 text-sm focus:border-primary/50 outline-none transition-all font-mono"
                                            placeholder={t('setup.access_token_placeholder')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowAccessToken(!showAccessToken)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg/20 hover:text-fg/50 transition-colors"
                                        >
                                            {showAccessToken ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
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
