import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Terminal, Lightbulb, Zap, Settings, Shield, Trash2, ExternalLink, RefreshCw, Cpu, Database, LogOut, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
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
    const [logs, setLogs] = useState<LogEvent[]>([]);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [activeTab, setActiveTab] = useState('discovery');
    const [isMining, setIsMining] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [needsSetup, setNeedsSetup] = useState(!isSupabaseConfigured);
    const [isInitialized, setIsInitialized] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
    const [isSyncSettingsOpen, setIsSyncSettingsOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
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

        // Refresh settings when modal closes
        const interval = setInterval(fetchSyncSettings, 2000);
        return () => clearInterval(interval);
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
                        animate={{ width: isCollapsed ? 84 : 256 }}
                        className="glass m-4 mr-0 p-6 flex flex-col gap-8 relative overflow-hidden"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 min-w-[40px] bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg glow-primary">
                                <Zap className="text-white fill-current" size={24} />
                            </div>
                            {!isCollapsed && (
                                <motion.h1
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-xl font-bold tracking-tight"
                                >
                                    ALCHEMY
                                </motion.h1>
                            )}
                        </div>

                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="absolute top-8 right-2 p-1.5 hover:bg-surface rounded-lg text-fg/20 hover:text-primary transition-colors"
                        >
                            <Settings size={14} className={isCollapsed ? "" : "rotate-90 transition-transform"} />
                        </button>

                        <nav className="flex flex-col gap-2">
                            <NavItem active={activeTab === 'discovery'} onClick={() => setActiveTab('discovery')} icon={<Lightbulb size={20} />} label="Discovery" collapsed={isCollapsed} />
                            <NavItem active={activeTab === 'engine'} onClick={() => setActiveTab('engine')} icon={<Cpu size={20} />} label="Engine" collapsed={isCollapsed} />
                            <NavItem active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<Terminal size={20} />} label="System Logs" collapsed={isCollapsed} />
                            <NavItem active={activeTab === 'account'} onClick={() => setActiveTab('account')} icon={<User size={20} />} label="Account" collapsed={isCollapsed} />
                        </nav>

                        <div className="mt-auto space-y-4">
                            <SidebarStats stats={signalStats} isMining={isMining} collapsed={isCollapsed} />
                            <button
                                onClick={() => supabase.auth.signOut()}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-fg/40 hover:text-error hover:bg-error/10 transition-all text-xs font-bold uppercase tracking-widest"
                            >
                                <LogOut size={16} /> {!isCollapsed && "Logout"}
                            </button>
                            <div className="p-4 glass bg-surface/30 rounded-xl border-border/10 overflow-hidden">
                                <div className="flex items-center gap-2 text-[10px] font-mono text-fg/40 uppercase tracking-widest">
                                    <User size={12} className="text-primary min-w-[12px]" />
                                    {!isCollapsed && <span className="truncate">{user?.email}</span>}
                                </div>
                                {!isCollapsed && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="mt-2 flex items-center justify-between text-[9px] font-mono text-fg/20 uppercase tracking-tighter border-t border-border/5 pt-2"
                                    >
                                        <span>Ver: 1.0.0</span>
                                        <span>DB: {import.meta.env.VITE_LATEST_MIGRATION_TIMESTAMP?.substring(0, 8)}</span>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </motion.aside>

                    {/* Main Content */}
                    <main className="flex-1 flex flex-col p-4 gap-4 overflow-hidden relative">
                        {activeTab === 'discovery' && (
                            <>
                                <header className="flex justify-between items-center px-4 py-2">
                                    <div>
                                        <h2 className="text-2xl font-bold">Discovery</h2>
                                        <p className="text-sm text-fg/50">Passive intelligence mining from your browser history.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsSyncSettingsOpen(true)}
                                            className="px-4 py-2 glass hover:bg-surface transition-colors flex items-center gap-2 text-sm font-medium"
                                        >
                                            <Settings size={16} />
                                            <div className="flex flex-col items-start">
                                                <span>Sync Settings</span>
                                                {(syncSettings.sync_start_date || syncSettings.last_sync_checkpoint) && (
                                                    <span className="text-[10px] text-fg/40 font-mono">
                                                        {syncSettings.sync_start_date
                                                            ? `From: ${new Date(syncSettings.sync_start_date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                                            : syncSettings.last_sync_checkpoint
                                                                ? `Checkpoint: ${new Date(syncSettings.last_sync_checkpoint).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                                                : ''
                                                        }
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                        <button
                                            onClick={triggerMining}
                                            disabled={isSyncing}
                                            className="px-4 py-2 glass hover:bg-surface transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                                            {isSyncing ? 'Syncing...' : 'Sync History'}
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

                        {activeTab === 'engine' && <AlchemistEngine />}
                        {activeTab === 'account' && <AccountSettings />}
                        {activeTab === 'logs' && <SystemLogsTab />}

                        <LiveTerminal isExpanded={isTerminalExpanded} onToggle={() => setIsTerminalExpanded(!isTerminalExpanded)} />
                    </main>

                    {/* Signal Detail Modal */}
                    <SignalDetailModal signal={selectedSignal} onClose={() => setSelectedSignal(null)} />

                    {/* Sync Settings Modal */}
                    <SyncSettingsModal isOpen={isSyncSettingsOpen} onClose={() => setIsSyncSettingsOpen(false)} />
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
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
                ? 'glass bg-primary/10 text-primary border-primary/20 shadow-sm'
                : 'text-fg/60 hover:bg-surface hover:text-fg'
                }`}
        >
            <div className="min-w-[20px] flex justify-center">
                {React.cloneElement(icon, { className: active ? 'text-primary' : '' } as any)}
            </div>
            {!collapsed && (
                <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="font-semibold text-sm whitespace-nowrap"
                >
                    {label}
                </motion.span>
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
                    {signal.category || 'Research'}
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
                    {new Date(signal.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
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
    const statusText = isMining ? 'Mining' : stats.total ? 'Standing by' : 'Idle';
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
        : 'Awaiting mining';
    const latestTitle = stats.latestTitle ?? 'No signals yet';

    return (
        <div
            className="glass p-4 rounded-2xl border border-border/10 bg-surface/70 space-y-3"
            aria-live="polite"
        >
            <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.4em] text-fg/40">
                <span>Signal Pulse</span>
                <span className="flex items-center gap-2 text-[9px] tracking-[0.3em]">
                    <span className={`h-2 w-2 rounded-full ${statusDot}`} aria-hidden="true" />
                    {statusText}
                </span>
            </div>
            <div>
                <p className="text-3xl font-black text-fg/90 leading-tight">{stats.total}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-fg/50">Signals tracked</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                    <div className="text-[9px] uppercase tracking-[0.4em] text-fg/40">Average score</div>
                    <div className="text-lg font-semibold text-primary">{stats.average}</div>
                </div>
                <div>
                    <div className="text-[9px] uppercase tracking-[0.4em] text-fg/40">Top signal</div>
                    <div className="text-lg font-semibold text-accent">{stats.top}</div>
                </div>
            </div>
            <div className="text-[10px] text-fg/50">
                <p className="text-[9px] uppercase tracking-[0.3em] text-fg/40">Latest</p>
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
