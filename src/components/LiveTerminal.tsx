import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ProcessingEvent, EventType } from '../lib/types';
import {
    Terminal,
    Brain,
    Zap,
    Info,
    AlertTriangle,
    Activity,
    Minimize2,
    Bug,
    Clock,
    ChevronDown,
    ChevronUp,
    Code,
    CheckCircle,
    RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTerminal } from '../context/TerminalContext';

interface LiveTerminalProps {
    isExpanded?: boolean;
    onToggle?: () => void;
}

export function LiveTerminal({ isExpanded: isExpandedProp, onToggle: onToggleProp }: LiveTerminalProps = {}) {
    const [events, setEvents] = useState<ProcessingEvent[]>([]);
    const { isExpanded: isExpandedContext, setIsExpanded: setIsExpandedContext } = useTerminal();
    const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

    // Use prop if provided, otherwise use context
    const isExpanded = isExpandedProp !== undefined ? isExpandedProp : isExpandedContext;
    const setIsExpanded = onToggleProp || (() => setIsExpandedContext(!isExpandedContext));

    useEffect(() => {
        fetchRecentEvents();

        const channel = supabase
            .channel('processing_events_feed')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'processing_events',
                },
                (payload: any) => {
                    const newEvent = payload.new as ProcessingEvent;

                    if (newEvent.event_type === 'error') {
                        setExpandedEvents(prev => ({ ...prev, [newEvent.id]: true }));
                    }

                    setEvents((prev) => {
                        const updated = [newEvent, ...prev];
                        if (updated.length > 50) return updated.slice(0, 50);
                        return updated;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchRecentEvents = async () => {
        const { data } = await supabase
            .from('processing_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(30);

        if (data) {
            setEvents(data);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedEvents(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const getIcon = (type: EventType, level?: string) => {
        if (level === 'debug') return <Bug size={14} className="text-fg/40" />;

        switch (type) {
            case 'analysis': return <Brain size={14} className="text-primary" />;
            case 'action': return <Zap size={14} className="text-accent" />;
            case 'error': return <AlertTriangle size={14} className="text-error" />;
            case 'system': return <RefreshCw size={14} className="text-success" />;
            default: return <Info size={14} className="text-fg/40" />;
        }
    };

    if (!isExpanded) {
        return (
            <button
                onClick={setIsExpanded}
                className="fixed bottom-6 right-6 z-50 glass p-4 flex items-center gap-3 hover:bg-surface transition-all shadow-xl group border-primary/10"
            >
                <div className="relative">
                    <Terminal size={20} className="text-primary" />
                    {events.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                    )}
                </div>
                <span className="text-xs font-bold uppercase tracking-widest hidden group-hover:block animate-in fade-in slide-in-from-right-2">Live Engine Log</span>
            </button>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="fixed bottom-6 right-6 z-50 w-[450px] max-h-[600px] glass shadow-2xl flex flex-col overflow-hidden border-primary/10"
        >
            <div className="p-4 border-b border-border/10 flex items-center justify-between bg-surface/50">
                <div className="flex items-center gap-2">
                    <Terminal size={18} className="text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest">Alchemist Engine</span>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold bg-success/10 text-success px-2 py-0.5 rounded-full border border-success/10 animate-pulse ml-2">
                        <Activity size={10} /> LIVE
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setEvents([])}
                        className="text-[10px] uppercase font-bold text-fg/40 hover:text-fg px-2 py-1 transition-colors"
                    >
                        Clear
                    </button>
                    <button
                        onClick={setIsExpanded}
                        className="text-fg/40 hover:text-fg p-1 transition-colors"
                    >
                        <Minimize2 size={18} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20">
                {events.length === 0 && (
                    <div className="text-center py-12 text-fg/20 italic text-xs">
                        Idle. Awaiting signal mining events...
                    </div>
                )}

                {events.map((event) => (
                    <div key={event.id} className="relative flex items-start gap-3 group">
                        <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-surface border border-white/5 flex items-center justify-center">
                            {getIcon(event.event_type, event.level)}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-fg/60 shrink-0">
                                    {new Date(event.created_at || Date.now()).toLocaleTimeString()}
                                </span>
                                <span className={`text-xs font-bold uppercase tracking-wider ${event.level === 'error' ? 'text-error' :
                                    event.level === 'warn' ? 'text-orange-400' :
                                        event.event_type === 'analysis' ? 'text-primary' : 'text-fg/90'
                                    }`}>
                                    {event.agent_state}
                                </span>

                                {event.duration_ms && (
                                    <span className="ml-auto text-[10px] font-mono bg-bg/50 px-1.5 py-0.5 rounded flex items-center gap-1 text-fg/40">
                                        <Clock size={10} />
                                        {event.duration_ms}ms
                                    </span>
                                )}
                            </div>

                            <p className={`text-sm break-words leading-relaxed ${event.level === 'debug' ? 'text-fg/50 font-mono text-xs' : ''
                                }`}>{event.message}</p>

                            {(event.details || event.metadata) && (
                                <div className="mt-2 text-xs">
                                    <button
                                        onClick={() => toggleExpand(event.id)}
                                        className="flex items-center gap-1 text-fg/40 hover:text-primary transition-colors"
                                    >
                                        {expandedEvents[event.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                        {expandedEvents[event.id] ? 'Hide Details' : 'View Details'}
                                    </button>

                                    <AnimatePresence>
                                        {expandedEvents[event.id] && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <pre className="mt-2 p-3 bg-bg/50 rounded border border-white/5 font-mono text-[10px] overflow-x-auto text-fg/70">
                                                    {JSON.stringify({ ...event.details, ...event.metadata }, null, 2)}
                                                </pre>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </motion.div >
    );
}
