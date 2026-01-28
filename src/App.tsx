import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Terminal, Lightbulb, Zap, Settings, Shield, Trash2, ExternalLink, RefreshCw, Cpu, Database, LogOut, User, Sun, Moon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Tag, MessageSquare, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import Auth from './components/Auth';
import { SetupWizard } from './components/SetupWizard';
import { AlchemistEngine } from './components/AlchemistEngine';
import { TerminalProvider } from './context/TerminalContext';
import { ToastProvider } from './context/ToastContext';
import { LiveTerminal } from './components/LiveTerminal';
import { AccountSettings } from './components/AccountSettings';
import { SignalDetailModal } from './components/SignalDetailModal';
import { SyncSettingsModal } from './components/SyncSettingsModal';
import { SystemLogsTab } from './components/SystemLogsTab';
import { DiscoveryTab } from './components/discovery';
import { ChatTab } from './components/chat/ChatTab';
import { ChangelogModal } from './components/ChangelogModal';
import { TransmuteTab } from './components/TransmuteTab';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { soundEffects } from './utils/soundEffects';

interface LogEvent {
    id: string;
    type: string;
    message: string;
    timestamp: string;
    data?: any;
}

interface Signal {
    id: string;
    title: string;
    score: number;
    summary: string;
    date: string;
    category?: string;
    entities?: string[];
    url?: string;
    content?: string;
}

export default function App() {
    const { t } = useTranslation();
    const [logs, setLogs] = useState<LogEvent[]>([]);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [activeTab, setActiveTab] = useState('discovery');
    const [isMining, setIsMining] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [needsSetup, setNeedsSetup] = useState(!isSupabaseConfigured);
    const [isInitialized, setIsInitialized] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
    const [isSyncSettingsOpen, setIsSyncSettingsOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        const saved = localStorage.getItem('theme');
        return (saved as 'light' | 'dark') || 'dark';
    });
    const [logsTabState, setLogsTabState] = useState<any>(null);

    const logEndRef = useRef<HTMLDivElement>(null);
    const signalStats = useMemo(() => {
        const total = signals.length;
        let sum = 0;
        let top = 0;
        let latestSignal: Signal | null = null;

        for (const signal of signals) {
            sum += signal.score;
            if (signal.score > top) {
                top = signal.score;
            }

            const currentDate = new Date(signal.date);
            if (!latestSignal || currentDate > new Date(latestSignal.date)) {
                latestSignal = signal;
            }
        }

        const average = total ? Math.round(sum / total) : 0;
        const latestTimestamp = latestSignal ? new Date(latestSignal.date) : null;

        return {
            total,
            average,
            top,
            latestTimestamp,
            latestTitle: latestSignal?.title ?? latestSignal?.category ?? null
        };
    }, [signals]);

    useEffect(() => {
        const checkAppStatus = async () => {
            if (!isSupabaseConfigured) {
                setNeedsSetup(true);
                setLoading(false);
                return;
            }

            try {
                // 1. Check if DB is initialized (first user exists)
                const { data: initData, error: initError } = await supabase
                    .from('init_state')
                    .select('is_initialized')
                    .single();

                if (initError) {
                    console.warn('[App] Init check error (might be fresh DB):', initError);
                    // If error 42P01 (relation skip) or similar, it's not initialized
                    if ((initError as any).code === '42P01') {
                        setIsInitialized(false);
                    }
                } else {
                    setIsInitialized(initData.is_initialized > 0);
                }

                // 2. Initial session check
                const { data: { session } } = await supabase.auth.getSession();
                setUser(session?.user ?? null);
            } catch (err) {
                console.error('[App] Status check failed:', err);
            } finally {
                setLoading(false);
            }
        };

        checkAppStatus();

        // Auth listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Apply theme to document root
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Fetch sync settings when user changes
    const [syncSettings, setSyncSettings] = useState<{ sync_start_date?: string | null, last_sync_checkpoint?: string | null }>({});

    useEffect(() => {
        const fetchSyncSettings = async () => {
            if (!user) return;

            const { data } = await supabase
                .from('alchemy_settings')
                .select('sync_start_date, last_sync_checkpoint')
                .eq('user_id', user.id)
                .maybeSingle();

            if (data) {
                setSyncSettings(data);
            }
        };

        fetchSyncSettings();
    }, [user, isSyncSettingsOpen]);

    // Subscribe to processing events for sync state and sound effects
    useEffect(() => {
        if (!user) return;

        // Fetch sound preference
        const fetchSoundPreference = async () => {
            const { data } = await supabase
                .from('alchemy_settings')
                .select('sound_enabled')
                .eq('user_id', user.id)
                .maybeSingle();

            if (data) {
                const enabled = data.sound_enabled ?? true;
                setSoundEnabled(enabled);
                soundEffects.setEnabled(enabled);
            }
        };

        fetchSoundPreference();

        // Subscribe to processing_events for real-time sync updates
        const channel = supabase
            .channel('processing_events')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'processing_events',
                    filter: `user_id=eq.${user.id}`
                },
                (payload: any) => {
                    const event = payload.new;

                    // Sync started - first Mining event
                    if (event.agent_state === 'Mining' && !isSyncing) {
                        setIsSyncing(true);
                        setIsTerminalExpanded(true);
                        if (soundEnabled) soundEffects.syncStart();
                    }

                    // Signal found
                    if (event.agent_state === 'Signal') {
                        if (soundEnabled) soundEffects.signalFound();
                    }

                    // Sync completed
                    if (event.agent_state === 'Completed') {
                        setIsSyncing(false);
                        if (soundEnabled) {
                            const hasErrors = event.metadata?.errors > 0;
                            if (hasErrors) {
                                soundEffects.error();
                            } else {
                                soundEffects.syncComplete();
                            }
                        }

                        // Auto-collapse terminal after 5 seconds
                        setTimeout(() => {
                            setIsTerminalExpanded(false);
                        }, 5000);

                        // Refresh signals
                        fetchSignals();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, isSyncing, soundEnabled]);

    useEffect(() => {
        // SSE for Live Log
        const eventSource = new EventSource('/events');

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'history') {
                setLogs((prev: LogEvent[]) => [...data.data, ...prev].slice(0, 100));
            } else {
                setLogs((prev: LogEvent[]) => [data, ...prev].slice(0, 100));
            }
        };

        // Initial signals fetch
        fetchSignals();

        return () => eventSource.close();
    }, [user]);

    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const fetchSignals = async () => {
        try {
            // Priority: Supabase cloud signals
            if (user) {
                const { data, error } = await supabase
                    .from('signals')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    setSignals(data.map((s: any) => ({
                        id: s.id,
                        title: s.title,
                        score: s.score,
                        summary: s.summary,
                        date: s.created_at,
                        category: s.category,
                        entities: s.entities
                    })));
                    return;
                }
            }

            // Fallback: Local API
            const res = await axios.get('/api/signals');
            setSignals(res.data);
        } catch (e) {
            console.error('Failed to fetch signals', e);
        }
    };

    const triggerMining = async () => {
        setIsMining(true);
        try {
            await axios.post('/api/mine');
            fetchSignals();
        } catch (err) {
            console.error('Mining failed:', err);
        } finally {
            setIsMining(false);
        }
    };

    const handleTerminalNavigation = (tab: string, state?: any) => {
        if (tab === 'logs') {
            setLogsTabState(state);
            setActiveTab('logs');
        } else {
            setActiveTab(tab);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-bg">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
    );

    if (needsSetup) return <SetupWizard onComplete={() => setNeedsSetup(false)} />;

    if (!user) return (
        <Auth
            onAuthSuccess={() => fetchSignals()}
            isInitialized={isInitialized}
        />
    );

    return (
        <ToastProvider>
            <TerminalProvider>
                <div className="flex h-screen w-screen overflow-hidden bg-bg text-fg">
                    {/* Sidebar */}
                    <motion.aside
                        animate={{ width: isCollapsed ? 72 : 240 }}
                        className="glass m-4 mr-0 flex flex-col relative"
                    >
                        {/* App Logo/Name */}
                        <div className={`px-4 py-3 pb-4 flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                            <div className="w-10 h-10 min-w-[40px] bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg glow-primary">
                                <Zap className="text-white fill-current" size={24} />
                            </div>
                            {!isCollapsed && (
                                <motion.h1
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-xl font-bold tracking-tight"
                                >
                                    Alchemist
                                </motion.h1>
                            )}
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 flex flex-col gap-1 px-3">
                            <NavItem active={activeTab === 'discovery'} onClick={() => setActiveTab('discovery')} icon={<Lightbulb size={20} />} label={t('tabs.discovery')} collapsed={isCollapsed} />
                            <NavItem active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageSquare size={20} />} label={t('tabs.chat')} collapsed={isCollapsed} />
                            <NavItem active={activeTab === 'transmute'} onClick={() => setActiveTab('transmute')} icon={<Zap size={20} />} label={t('tabs.transmute')} collapsed={isCollapsed} />
                            <NavItem active={activeTab === 'engine'} onClick={() => setActiveTab('engine')} icon={<Settings size={20} />} label={t('common.settings')} collapsed={isCollapsed} />
                            <NavItem active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<Terminal size={20} />} label={t('tabs.logs')} collapsed={isCollapsed} />
                            <NavItem active={activeTab === 'account'} onClick={() => setActiveTab('account')} icon={<User size={20} />} label={t('common.account')} collapsed={isCollapsed} />
                        </nav>

                        {/* Language Switcher */}
                        <div className="px-3 pb-2 border-t border-white/5 pt-4 mt-2 relative z-[100]">
                            <div className={isCollapsed ? 'flex justify-center' : 'px-1'}>
                                <LanguageSwitcher collapsed={isCollapsed} />
                            </div>
                        </div>

                        {/* Theme Toggle */}
                        <div className="px-3 pb-2">
                            <button
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2.5 rounded-lg text-fg/40 hover:text-fg hover:bg-surface/50 transition-all text-xs font-medium`}
                                title={isCollapsed ? (theme === 'dark' ? t('shell.switch_light') : t('shell.switch_dark')) : ''}
                            >
                                <div className="min-w-[20px] flex justify-center">
                                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                                </div>
                                {!isCollapsed && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="whitespace-nowrap"
                                    >
                                        {theme === 'dark' ? t('common.light_mode') : t('common.dark_mode')}
                                    </motion.span>
                                )}
                            </button>
                        </div>

                        {/* Collapse Toggle at Bottom */}
                        <div className="px-3 pb-3">
                            <button
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className={`w-full flex items-center px-4 py-2.5 rounded-lg text-fg/40 hover:text-fg hover:bg-surface/50 transition-all text-xs font-medium ${isCollapsed ? 'justify-center' : 'gap-3'}`}
                            >
                                {isCollapsed ? (
                                    <ChevronsRight size={20} />
                                ) : (
                                    <>
                                        <div className="min-w-[20px] flex justify-center">
                                            <ChevronsLeft size={20} />
                                        </div>
                                        <span>{t('common.collapse')}</span>
                                    </>
                                )}
                            </button>

                            {/* Version Badge */}
                            <button
                                onClick={() => setShowChangelog(true)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-2 text-[10px] font-mono text-fg/30 hover:text-primary hover:bg-surface/30 rounded-lg transition-all group"
                                title={t('shell.view_changelog')}
                            >
                                {!isCollapsed && (
                                    <>
                                        <Tag size={12} className="group-hover:text-primary transition-colors" />
                                        <span>v{import.meta.env.VITE_APP_VERSION || '1.0.15'}</span>
                                    </>
                                )}
                                {isCollapsed && <Tag size={14} className="group-hover:text-primary transition-colors" />}
                            </button>
                        </div>
                    </motion.aside>

                    {/* Main Content */}
                    <main className="flex-1 flex flex-col p-4 gap-4 overflow-hidden relative">
                        {activeTab === 'discovery' && (
                            <>
                                <header className="flex justify-between items-center px-4 py-2">
                                    <div>
                                        <h2 className="text-2xl font-bold">{t('tabs.discovery')}</h2>
                                        <p className="text-sm text-fg/50">{t('setup.welcome_desc')}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsSyncSettingsOpen(true)}
                                            className="px-6 py-3 glass hover:bg-surface transition-colors flex items-center gap-2 text-sm font-medium"
                                        >
                                            <Settings size={16} />
                                            <div className="flex flex-col items-start">
                                                <span>{t('discovery.sync_settings')}</span>
                                                <span className="text-[10px] text-fg/40 font-mono">
                                                    {syncSettings.sync_start_date
                                                        ? `${t('discovery.from')}: ${new Date(syncSettings.sync_start_date).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                                        : syncSettings.last_sync_checkpoint
                                                            ? `${t('discovery.checkpoint')}: ${new Date(syncSettings.last_sync_checkpoint).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                                            : t('discovery.all_time')
                                                    }
                                                </span>
                                            </div>
                                        </button>
                                        <button
                                            onClick={triggerMining}
                                            disabled={isSyncing}
                                            className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg glow-primary hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                        >
                                            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                                            {isSyncing ? t('discovery.syncing') : t('discovery.sync_history')}
                                        </button>
                                    </div>
                                </header>

                                <DiscoveryTab
                                    onOpenUrl={(url) => window.open(url, '_blank', 'noopener,noreferrer')}
                                    onCopyText={(text) => {
                                        navigator.clipboard.writeText(text)
                                        // Could add toast notification here
                                    }}
                                />
                            </>
                        )}

                        {activeTab === 'chat' && <ChatTab />}
                        {activeTab === 'transmute' && <TransmuteTab />}
                        {activeTab === 'engine' && <AlchemistEngine />}
                        {activeTab === 'account' && <AccountSettings />}
                        {activeTab === 'logs' && <SystemLogsTab initialState={logsTabState} />}

                        <LiveTerminal
                            isExpanded={isTerminalExpanded}
                            onToggle={() => setIsTerminalExpanded(!isTerminalExpanded)}
                            onNavigate={handleTerminalNavigation}
                            liftUp={activeTab === 'chat'}
                        />
                    </main>

                    {/* Signal Detail Modal */}
                    <SignalDetailModal signal={selectedSignal} onClose={() => setSelectedSignal(null)} />

                    {/* Sync Settings Modal */}
                    <SyncSettingsModal isOpen={isSyncSettingsOpen} onClose={() => setIsSyncSettingsOpen(false)} />

                    {/* Changelog Modal */}
                    <ChangelogModal isOpen={showChangelog} onClose={() => setShowChangelog(false)} />
                </div>
            </TerminalProvider>
        </ToastProvider>
    );
}

function NavItem({ active, icon, label, onClick, collapsed }: { active: boolean, icon: React.ReactElement, label: string, onClick: () => void, collapsed?: boolean }) {
    return (
        <button
            onClick={onClick}
            title={collapsed ? label : ""}
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl transition-all ${active
                ? 'bg-primary/10 text-primary shadow-sm'
                : 'text-fg/60 hover:bg-surface hover:text-fg'
                }`}
        >
            {collapsed ? (
                React.cloneElement(icon, { className: active ? 'text-primary' : '' } as any)
            ) : (
                <>
                    <div className="min-w-[20px] flex justify-center">
                        {React.cloneElement(icon, { className: active ? 'text-primary' : '' } as any)}
                    </div>
                    <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="font-semibold text-sm whitespace-nowrap"
                    >
                        {label}
                    </motion.span>
                </>
            )}
        </button>
    );
}

function SignalCard({ signal, onClick }: { signal: Signal; onClick?: () => void }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -5 }}
            onClick={onClick}
            className="glass p-6 group cursor-pointer relative overflow-hidden flex flex-col h-full"
        >
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink size={16} className="text-fg/40 hover:text-primary transition-colors" />
            </div>

            <div className="flex justify-between items-start mb-4">
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded border border-primary/20 uppercase tracking-wider">
                    {signal.category ? t(`common.categories.${signal.category.toLowerCase()}`, signal.category) : t('common.categories.other')}
                </span>
                <span className={`text-2xl font-black ${signal.score >= 80 ? 'text-accent' : 'text-fg/40'}`}>
                    {signal.score}
                </span>
            </div>

            <h3 className="text-lg font-bold leading-tight mb-3 line-clamp-2">{signal.title}</h3>
            <p className="text-xs text-fg/50 leading-relaxed mb-6 line-clamp-3">
                {signal.summary}
            </p>

            <div className="mt-auto pt-4 border-t border-border/10 flex justify-between items-center">
                <div className="flex gap-1">
                    {signal.entities?.slice(0, 2).map(e => (
                        <span key={e} className="text-[9px] font-mono bg-surface/50 px-1.5 py-0.5 rounded border border-border/20 text-fg/40">{e}</span>
                    ))}
                </div>
                <span className="text-[9px] font-mono text-fg/20 uppercase">
                    {new Date(signal.date).toLocaleDateString(t('common.locale_code'), { month: 'short', day: 'numeric' })}
                </span>
            </div>
        </motion.div>
    );
}

interface SignalMetrics {
    total: number;
    average: number;
    top: number;
    latestTimestamp: Date | null;
    latestTitle: string | null;
}

function SidebarStats({ stats, isMining, collapsed }: { stats: SignalMetrics; isMining: boolean; collapsed: boolean }) {
    const { t } = useTranslation();
    const statusText = isMining ? t('stats.mining') : stats.total ? t('stats.standing_by') : t('stats.idle');
    const statusDot = isMining ? 'bg-accent' : stats.total ? 'bg-success' : 'bg-fg/30';

    if (collapsed) {
        return (
            <div className="glass h-12 flex items-center justify-center rounded-2xl border border-border/10">
                <span className={`h-2 w-2 rounded-full ${statusDot}`} aria-hidden="true" />
                <span className="sr-only">{`${statusText} • ${stats.total} signals`}</span>
            </div>
        );
    }

    const latestLabel = stats.latestTimestamp
        ? `${stats.latestTimestamp.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${stats.latestTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : t('stats.awaiting');
    const latestTitle = stats.latestTitle ?? t('stats.no_signals');

    return (
        <div
            className="glass p-4 rounded-2xl border border-border/10 bg-surface/70 space-y-3"
            aria-live="polite"
        >
            <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.4em] text-fg/40">
                <span>{t('stats.title')}</span>
                <span className="flex items-center gap-2 text-[9px] tracking-[0.3em]">
                    <span className={`h-2 w-2 rounded-full ${statusDot}`} aria-hidden="true" />
                    {statusText}
                </span>
            </div>
            <div>
                <p className="text-3xl font-black text-fg/90 leading-tight">{stats.total}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-fg/50">{t('stats.tracked')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                    <div className="text-[9px] uppercase tracking-[0.4em] text-fg/40">{t('stats.avg_score')}</div>
                    <div className="text-lg font-semibold text-primary">{stats.average}</div>
                </div>
                <div>
                    <div className="text-[9px] uppercase tracking-[0.4em] text-fg/40">{t('stats.top_signal')}</div>
                    <div className="text-lg font-semibold text-accent">{stats.top}</div>
                </div>
            </div>
            <div className="text-[10px] text-fg/50">
                <p className="text-[9px] uppercase tracking-[0.3em] text-fg/40">{t('stats.latest')}</p>
                <p className="font-semibold text-fg/80">{latestTitle}</p>
                <p className="text-[9px] text-fg/40">{latestLabel}</p>
            </div>
        </div>
    );
}

function getTypeColor(type: string) {
    switch (type) {
        case 'miner': return 'text-primary';
        case 'router': return 'text-accent';
        case 'alchemist': return 'text-success';
        case 'system': return 'text-fg/40';
        default: return 'text-fg';
    }
}
