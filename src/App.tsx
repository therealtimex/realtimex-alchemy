import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Lightbulb, Zap, Settings, Shield, Trash2, ExternalLink, RefreshCw, Cpu, Database, LogOut, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';

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
}

export default function App() {
    const [logs, setLogs] = useState<LogEvent[]>([]);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [activeTab, setActiveTab] = useState('discovery');
    const [isMining, setIsMining] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Auth listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

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
    }, []);

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
            await axios.get('/api/test/mine/chrome');
            fetchSignals();
        } finally {
            setIsMining(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-bg">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
    );

    if (!user) return <Auth onAuthSuccess={() => fetchSignals()} />;

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-bg text-fg">
            {/* Sidebar */}
            <aside className="w-64 glass m-4 mr-0 p-6 flex flex-col gap-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg glow-primary">
                        <Zap className="text-white fill-current" size={24} />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">ALCHEMY</h1>
                </div>

                <nav className="flex flex-col gap-2">
                    <NavItem active={activeTab === 'discovery'} onClick={() => setActiveTab('discovery')} icon={<Lightbulb size={20} />} label="Discovery" />
                    <NavItem active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<Terminal size={20} />} label="System Logs" />
                    <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20} />} label="Alchemist" />
                </nav>

                <div className="mt-auto space-y-4">
                    <button
                        onClick={() => supabase.auth.signOut()}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-fg/40 hover:text-error hover:bg-error/10 transition-all text-xs font-bold uppercase tracking-widest"
                    >
                        <LogOut size={16} /> Logout
                    </button>
                    <div className="p-4 glass bg-surface/30 rounded-xl border-border/30">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-fg/40 uppercase tracking-widest">
                            <User size={12} className="text-primary" />
                            <span className="truncate">{user?.email}</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
                {activeTab === 'discovery' && (
                    <>
                        <header className="flex justify-between items-center px-4 py-2">
                            <div>
                                <h2 className="text-2xl font-bold">Signal Stream</h2>
                                <p className="text-sm text-fg/50">Passive intelligence mining from your browser history.</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={triggerMining}
                                    disabled={isMining}
                                    className="px-4 py-2 glass hover:bg-surface transition-colors flex items-center gap-2 text-sm font-medium"
                                >
                                    <RefreshCw size={16} className={isMining ? 'animate-spin' : ''} />
                                    {isMining ? 'Mining...' : 'Sync History'}
                                </button>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                                <AnimatePresence mode="popLayout">
                                    {signals.map((signal) => (
                                        <SignalCard key={signal.id} signal={signal} />
                                    ))}
                                    {signals.length === 0 && !isMining && (
                                        <div className="col-span-full h-64 flex flex-col items-center justify-center text-fg/20 border-2 border-dashed border-border rounded-3xl">
                                            <Database size={48} className="mb-4" />
                                            <p className="font-medium italic">No high-density signals discovered yet.</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'settings' && <SettingsView />}
                {activeTab === 'logs' && <div className="flex-1 p-8 text-fg/30 italic">Log history view coming soon... Use the terminal below for live events.</div>}

                {/* Live Terminal */}
                <section className="h-64 glass m-0 overflow-hidden flex flex-col shrink-0">
                    <div className="px-6 py-3 border-b border-border flex justify-between items-center bg-surface/50">
                        <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-fg/40 uppercase">
                            <Terminal size={14} /> Discovery Log (Experimental)
                        </div>
                        <div className="flex gap-2 items-center">
                            <span className="text-[10px] font-mono text-fg/30 uppercase tracking-tighter">Event-Stream Active</span>
                            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 font-mono text-xs space-y-1.5 custom-scrollbar bg-black/20">
                        {logs.map((log) => (
                            <motion.div
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                key={log.id}
                                className="flex gap-4 group hover:bg-white/5 px-2 rounded -mx-2 py-0.5 transition-colors"
                            >
                                <span className="text-fg/20 shrink-0">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
                                <span className={`shrink-0 font-bold w-20 \${getTypeColor(log.type)}`}>{log.type.toUpperCase()}</span>
                                <span className="text-fg/70">
                                    {log.message}
                                    {log.data && <span className="text-fg/20 ml-2">({log.data.category || 'metadata'})</span>}
                                </span>
                            </motion.div>
                        ))}
                        <div ref={logEndRef} />
                    </div>
                </section>
            </main>
        </div>
    );
}

function NavItem({ active, icon, label, onClick }: { active: boolean, icon: React.ReactElement, label: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all \${
          active 
            ? 'glass bg-primary/10 text-primary border-primary/20 shadow-sm' 
            : 'text-fg/60 hover:bg-surface hover:text-fg'
        }`}
        >
            {React.cloneElement(icon, { className: active ? 'text-primary' : '' } as any)}
            <span className="font-semibold text-sm">{label}</span>
        </button>
    );
}

function SignalCard({ signal }: { signal: Signal }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -5 }}
            className="glass p-6 group cursor-pointer relative overflow-hidden flex flex-col h-full"
        >
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink size={16} className="text-fg/40 hover:text-primary transition-colors" />
            </div>

            <div className="flex justify-between items-start mb-4">
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded border border-primary/20 uppercase tracking-wider">
                    {signal.category || 'Research'}
                </span>
                <span className={`text-2xl font-black \${signal.score >= 80 ? 'text-accent' : 'text-fg/40'}`}>
                    {signal.score}
                </span>
            </div>

            <h3 className="text-lg font-bold leading-tight mb-3 line-clamp-2">{signal.title}</h3>
            <p className="text-xs text-fg/50 leading-relaxed mb-6 line-clamp-3">
                {signal.summary}
            </p>

            <div className="mt-auto pt-4 border-t border-border/30 flex justify-between items-center">
                <div className="flex gap-1">
                    {signal.entities?.slice(0, 2).map(e => (
                        <span key={e} className="text-[9px] font-mono bg-surface/50 px-1.5 py-0.5 rounded border border-border/50 text-fg/40">{e}</span>
                    ))}
                </div>
                <span className="text-[9px] font-mono text-fg/20 uppercase">
                    {new Date(signal.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
            </div>
        </motion.div>
    );
}

function SettingsView() {
    return (
        <div className="flex-1 max-w-2xl mx-auto w-full p-8 space-y-8 overflow-y-auto custom-scrollbar">
            <header>
                <h2 className="text-2xl font-bold mb-2">Alchemist Configuration</h2>
                <p className="text-sm text-fg/50 font-medium">Fine-tune the intelligence engine and data sources.</p>
            </header>

            <section className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-fg/40 flex items-center gap-2">
                        <Cpu size={14} /> AI Provider
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                        <ProviderOption active label="Ollama (Local)" icon="🦙" />
                        <ProviderOption active={false} label="OpenAI (Cloud)" icon="✨" />
                        <ProviderOption active={false} label="Anthropic (Cloud)" icon="⚡" />
                    </div>
                </div>

                <div className="glass p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold">Discovery Sensitivity</label>
                        <span className="text-accent text-sm font-bold">Signal &gt; 70</span>
                    </div>
                    <input type="range" className="w-full accent-primary bg-surface h-2 rounded-lg appearance-none cursor-pointer" />
                    <p className="text-[10px] text-fg/40 italic">Higher sensitivity filters more noise but might miss emerging signals.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="glass p-6">
                        <h4 className="flex items-center gap-2 text-sm font-bold mb-4">
                            <Shield size={16} className="text-primary" /> Blacklisted Domains
                        </h4>
                        <div className="text-xs text-fg/40 bg-black/20 p-3 rounded font-mono">
                            google.com, localhost, facebook.com, twitter.com...
                        </div>
                    </div>
                    <div className="glass p-6 flex flex-col justify-center items-center text-center">
                        <Trash2 size={24} className="text-error/40 mb-3" />
                        <h4 className="text-sm font-bold mb-1">Retention Policy</h4>
                        <p className="text-[10px] text-fg/40">Signals are purged after 30 days locally unless transmuted.</p>
                    </div>
                </div>
            </section>
        </div>
    );
}

function ProviderOption({ active, label, icon }: { active: boolean, label: string, icon: string }) {
    return (
        <div className={`glass p-4 text-center cursor-pointer transition-all \${active ? 'border-primary bg-primary/5' : 'opacity-40 hover:opacity-100'}`}>
            <div className="text-2xl mb-2">{icon}</div>
            <div className="text-xs font-bold uppercase tracking-tighter">{label}</div>
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
