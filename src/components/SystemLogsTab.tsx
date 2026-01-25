import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronRight, ExternalLink, Zap, SkipForward, Search, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SignalCard } from './discovery/SignalCard';
import { NoteModal } from './discovery/NoteModal';
import { Signal } from '../lib/types';

interface SyncRun {
    id: string;
    // ... (rest of SyncRun)
    started_at: string;
    completed_at: string;
    duration_ms: number;
    signals_found: number;
    urls_processed: number;
    skipped: number;
    errors: number;
    status: 'success' | 'failed' | 'partial';
}

// ... (SourceDetail, UrlResult, ProcessingEvent interfaces remain same)

interface SourceDetail {
    label: string;
    browser: string;
    urls_found: number;
    duration_ms: number;
    status: 'success' | 'error';
}

interface UrlResult {
    url: string;
    result: 'signal' | 'skipped' | 'error';
    score?: number;
    category?: string;
    reason?: string;
    duration_ms?: number;
    source_label?: string;  // Track which source this URL came from
}

interface ProcessingEvent {
    id: string;
    event_type: string;
    agent_state: string;
    message: string;
    level?: string;
    duration_ms?: number;
    details?: any;
    metadata?: any;
    created_at: string;
}

export function SystemLogsTab({ initialState }: { initialState?: any }) {
    const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRun, setSelectedRun] = useState<string | null>(null);
    const [selectedSource, setSelectedSource] = useState<string | null>(null);
    const [runEvents, setRunEvents] = useState<ProcessingEvent[]>([]);
    const [sourceDetails, setSourceDetails] = useState<SourceDetail[]>([]);
    const [urlResults, setUrlResults] = useState<UrlResult[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // New state for Blacklist feature
    const [showBlacklistModal, setShowBlacklistModal] = useState(false);
    const [showErrorsModal, setShowErrorsModal] = useState(false);
    const [showSignalsModal, setShowSignalsModal] = useState(false);
    const [noteTarget, setNoteTarget] = useState<{ id: string, note: string | null, title: string } | null>(null);

    // Filter/Pagination State for Signals Modal
    const [signalsPage, setSignalsPage] = useState(0);
    const [signalsSearch, setSignalsSearch] = useState('');
    const [signalsFilter, setSignalsFilter] = useState<string | null>(null);
    const [signalsScoreFilter, setSignalsScoreFilter] = useState<string>('all');
    const [loadingSignals, setLoadingSignals] = useState(false);

    // Data state for modals
    const [blacklistSuggestions, setBlacklistSuggestions] = useState<any[]>([]);
    const [errorEvents, setErrorEvents] = useState<ProcessingEvent[]>([]);
    const [recentSignals, setRecentSignals] = useState<Signal[]>([]);
    const [stats, setStats] = useState({ errors: 0, signals: 0 });

    useEffect(() => {
        fetchSyncRuns();
    }, []);

    // Fetch signals when modal opens or params change
    useEffect(() => {
        if (showSignalsModal) {
            fetchRecentSignals(signalsPage);
        }
    }, [showSignalsModal, signalsPage, signalsFilter, signalsScoreFilter]);
    // Note: We don't auto-fetch on 'signalsSearch' to avoid spamming while typing. 
    // We rely on Enter key or debounce, but for now we'll fetch on debounce or implicit via effect?
    // Actually simplicity: Let's fetch on debounce or just Enter key in the UI. 
    // BUT to keep it responsive, simple useEffect is fine if we debounce.
    // For now, I'll rely on the `onKeyDown` in UI calling `fetchRecentSignals` and the dependency array logic.
    // To make it robust:
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (showSignalsModal) fetchRecentSignals(0);
        }, 500);
        return () => clearTimeout(timeout);
    }, [signalsSearch]);


    useEffect(() => {
        if (initialState) {
            // Handle Jump from Terminal
            if (initialState.type === 'blacklist_suggestion') {
                setBlacklistSuggestions(initialState.data?.suggestions || []);
                setShowBlacklistModal(true);
            }
            if (initialState.filter === 'errors') {
                setShowErrorsModal(true);
                fetchRecentErrors();
            }
        }
    }, [initialState]);

    useEffect(() => {
        // Calculate stats from sync runs
        if (syncRuns.length > 0) {
            const errors = syncRuns.reduce((acc, run) => acc + run.errors, 0);
            const signals = syncRuns.reduce((acc, run) => acc + run.signals_found, 0);
            setStats({ errors, signals });
        }
    }, [syncRuns]);

    const fetchRecentErrors = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('processing_events')
            .select('*')
            .eq('user_id', user.id)
            .eq('event_type', 'error')
            .order('created_at', { ascending: false })
            .limit(50);

        if (!error && data) {
            setErrorEvents(data);
        }
    };

    const fetchRecentSignals = async (page = 0) => {
        setLoadingSignals(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const PAGE_SIZE = 20;
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
            .from('signals')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (signalsFilter) {
            query = query.eq('category', signalsFilter);
        }

        if (signalsScoreFilter === 'high') {
            query = query.gte('score', 80);
        } else if (signalsScoreFilter === 'medium') {
            query = query.gte('score', 50).lt('score', 80);
        } else if (signalsScoreFilter === 'low') {
            query = query.lt('score', 50);
        }

        if (signalsSearch) {
            query = query.or(`title.ilike.%${signalsSearch}%,url.ilike.%${signalsSearch}%`);
        }

        const { data, error } = await query;

        if (!error && data) {
            setRecentSignals(data);
        }
        setLoadingSignals(false);
    };

    const fetchSyncRuns = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: completionEvents, error } = await supabase
                .from('processing_events')
                .select('*')
                .eq('user_id', user.id)
                .eq('agent_state', 'Completed')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Error fetching sync runs:', error);
                return;
            }

            const runs: SyncRun[] = (completionEvents || []).map(event => {
                const metadata = event.metadata || {};
                const errors = metadata.errors || 0;
                const signals = metadata.signals_found || 0;
                const skipped = metadata.skipped || 0;

                return {
                    id: event.id,
                    started_at: event.created_at,
                    completed_at: event.created_at,
                    duration_ms: event.duration_ms || 0,
                    signals_found: signals,
                    urls_processed: metadata.total_urls || 0,
                    skipped: skipped,
                    errors: errors,
                    status: errors > 0 ? 'partial' : signals > 0 ? 'success' : 'failed'
                };
            });

            setSyncRuns(runs);
        } catch (err) {
            console.error('Failed to fetch sync runs:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRunDetails = async (runId: string) => {
        setLoadingDetails(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const completionEvent = syncRuns.find(r => r.id === runId);
            if (!completionEvent) return;

            const startTime = new Date(new Date(completionEvent.started_at).getTime() - completionEvent.duration_ms);
            const endTime = new Date(completionEvent.completed_at);

            const { data: events, error } = await supabase
                .from('processing_events')
                .select('*')
                .eq('user_id', user.id)
                .gte('created_at', startTime.toISOString())
                .lte('created_at', endTime.toISOString())
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching run events:', error);
                return;
            }

            setRunEvents(events || []);

            // Extract source details from Mining events
            const sources: SourceDetail[] = [];
            const miningEvents = (events || []).filter(e => e.agent_state === 'Mining' && e.message.includes('Mining source:'));

            for (const event of miningEvents) {
                const match = event.message.match(/Mining source: (.+) \((.+)\)/);
                if (match) {
                    const label = match[1];
                    const browser = match[2];

                    // Find corresponding completion event for this source
                    const sourceCompletion = (events || []).find(e =>
                        e.agent_state === 'Mining' &&
                        e.message.includes(`Found`) &&
                        e.message.includes(label) &&
                        e.created_at > event.created_at
                    );

                    const urlsMatch = sourceCompletion?.message.match(/Found (\d+) URLs/);
                    const urlsFound = urlsMatch ? parseInt(urlsMatch[1]) : 0;

                    sources.push({
                        label,
                        browser,
                        urls_found: urlsFound,
                        duration_ms: sourceCompletion?.duration_ms || 0,
                        status: event.event_type === 'error' ? 'error' : 'success'
                    });
                }
            }


            setSourceDetails(sources);

            // Extract URL results from Reading/Thinking/Signal/Skipped events
            // Associate each URL with its source based on timing
            const urls: UrlResult[] = [];
            const readingEvents = (events || []).filter(e => e.agent_state === 'Reading');

            for (const readEvent of readingEvents) {
                const urlMatch = readEvent.message.match(/Reading content from: (.+)/);
                if (!urlMatch) continue;

                const url = urlMatch[1];

                // Simplified approach: Since URL processing happens AFTER all sources are mined,
                // we can't rely on timing. Instead, assign URLs to the source that found them.
                // For now, if there's only one source with URLs, assign all to it.
                // Otherwise, assign to the first source (this is a limitation we can improve later)
                let sourceLabel = sources.length > 0 ? sources[0].label : 'Unknown';

                // If only one source found URLs, use that
                const sourcesWithUrls = sources.filter(s => s.urls_found > 0);
                if (sourcesWithUrls.length === 1) {
                    sourceLabel = sourcesWithUrls[0].label;
                } else if (sourcesWithUrls.length > 1) {
                    // Multiple sources - distribute URLs proportionally
                    // For now, just use first source (TODO: improve this logic)
                    sourceLabel = sourcesWithUrls[0].label;
                }

                console.log(`[SystemLogs] URL ${url} assigned to source: ${sourceLabel}`); // Find result for this URL
                const signalEvent = (events || []).find(e =>
                    e.agent_state === 'Signal' &&
                    e.created_at > readEvent.created_at &&
                    e.message.includes('Found signal')
                );

                const skippedEvent = (events || []).find(e =>
                    e.agent_state === 'Skipped' &&
                    e.created_at > readEvent.created_at &&
                    e.message.includes('Irrelevant content')
                );

                const errorEvent = (events || []).find(e =>
                    e.event_type === 'error' &&
                    e.created_at > readEvent.created_at
                );

                if (signalEvent) {
                    const scoreMatch = signalEvent.message.match(/\((\d+)%\)/);
                    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

                    urls.push({
                        url,
                        result: 'signal',
                        score,
                        category: signalEvent.details?.category || 'Unknown',
                        duration_ms: signalEvent.duration_ms,
                        source_label: sourceLabel
                    });
                } else if (skippedEvent) {
                    const reasonMatch = skippedEvent.message.match(/\((\d+)%\): (.+)/);
                    const score = reasonMatch ? parseInt(reasonMatch[1]) : 0;
                    const reason = reasonMatch ? reasonMatch[2] : 'Irrelevant';

                    urls.push({
                        url,
                        result: 'skipped',
                        score,
                        reason,
                        duration_ms: skippedEvent.duration_ms,
                        source_label: sourceLabel
                    });
                } else if (errorEvent) {
                    urls.push({
                        url,
                        result: 'error',
                        reason: errorEvent.message,
                        source_label: sourceLabel
                    });
                }
            }

            setUrlResults(urls);
        } catch (err) {
            console.error('Failed to fetch run details:', err);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleRunClick = (runId: string) => {
        if (selectedRun === runId) {
            setSelectedRun(null);
            setSelectedSource(null);
            setSourceDetails([]);
            setUrlResults([]);
        } else {
            setSelectedRun(runId);
            setSelectedSource(null);
            fetchRunDetails(runId);
        }
    };

    const handleSourceClick = (sourceLabel: string) => {
        setSelectedSource(selectedSource === sourceLabel ? null : sourceLabel);
    };

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="w-5 h-5 text-success" />;
            case 'failed':
                return <XCircle className="w-5 h-5 text-error" />;
            case 'partial':
                return <AlertCircle className="w-5 h-5 text-warning" />;
            default:
                return <Clock className="w-5 h-5 text-fg/40" />;
        }
    };

    const getResultIcon = (result: string) => {
        switch (result) {
            case 'signal':
                return <Zap className="w-4 h-4 text-primary" />;
            case 'skipped':
                return <SkipForward className="w-4 h-4 text-fg/40" />;
            case 'error':
                return <XCircle className="w-4 h-4 text-error" />;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden p-8">
            <div className="mb-6">
                <h2 className="text-2xl font-bold">System Logs</h2>
                <p className="text-sm text-fg/50">Detailed history of sync runs, sources, and URL processing</p>

                {/* Overview Cards */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                    <div
                        className="glass p-4 rounded-xl border border-border/10 hover:bg-surface/50 transition-colors cursor-pointer group relative overflow-hidden"
                        onClick={() => setShowBlacklistModal(true)}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-fg/40">Potential Blacklist</span>
                            <AlertCircle size={16} className="text-orange-400" />
                        </div>
                        <div className="text-2xl font-black text-fg/90">
                            {blacklistSuggestions.length > 0 ? blacklistSuggestions.length : '--'}
                        </div>
                        <div className="text-[10px] text-fg/40 mt-1">Candidates for blocking</div>
                        {blacklistSuggestions.length > 0 && (
                            <div className="absolute top-2 right-2 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-400"></span>
                            </div>
                        )}
                    </div>

                    <div
                        className="glass p-4 rounded-xl border border-border/10 hover:bg-surface/50 transition-colors cursor-pointer group"
                        onClick={() => {
                            setShowErrorsModal(true);
                            fetchRecentErrors();
                        }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-fg/40">Recent Errors</span>
                            <XCircle size={16} className="text-error" />
                        </div>
                        <div className="text-2xl font-black text-fg/90">{stats.errors}</div>
                        <div className="text-[10px] text-fg/40 mt-1">Failed URL processes</div>
                    </div>

                    <div
                        className="glass p-4 rounded-xl border border-border/10 hover:bg-surface/50 transition-colors cursor-pointer group"
                        onClick={() => {
                            setShowSignalsModal(true);
                            fetchRecentSignals();
                        }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-fg/40">Total Signals</span>
                            <Zap size={16} className="text-primary" />
                        </div>
                        <div className="text-2xl font-black text-fg/90">{stats.signals}</div>
                        <div className="text-[10px] text-fg/40 mt-1">Successfully mined</div>
                    </div>
                </div>
            </div>

            {/* Blacklist Suggestions Modal */}
            <AnimatePresence>
                {showBlacklistModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-bg border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
                        >
                            <div className="p-6 border-b border-border flex items-center justify-between bg-surface/30">
                                <div>
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <AlertCircle className="text-orange-400" />
                                        Blacklist Suggestions
                                    </h3>
                                    <p className="text-sm text-fg/60">Review domains suggested for blacklisting based on low scores.</p>
                                </div>
                                <button
                                    onClick={() => setShowBlacklistModal(false)}
                                    className="p-2 hover:bg-surface rounded-lg transition-colors"
                                >
                                    <XCircle size={20} className="text-fg/40" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-surface/10 space-y-4">
                                {blacklistSuggestions.length === 0 ? (
                                    <div className="text-center py-12 text-fg/40">
                                        <div className="bg-surface/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle size={32} className="text-success" />
                                        </div>
                                        <p className="font-medium">No suggestions right now</p>
                                        <p className="text-xs opacity-70 mt-1">Your signal quality looks good!</p>
                                    </div>
                                ) : (
                                    blacklistSuggestions.map((suggestion, idx) => (
                                        <div key={idx} className="glass p-4 rounded-xl border border-border/10 flex items-center justify-between group hover:border-primary/20 transition-all">
                                            <div>
                                                <div className="font-mono text-sm font-bold text-fg/90">{suggestion.domain}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] bg-surface px-1.5 py-0.5 rounded text-fg/50">
                                                        {suggestion.signalCount} signals
                                                    </span>
                                                    <span className="text-[10px] bg-surface px-1.5 py-0.5 rounded text-fg/50">
                                                        Avg Score: {suggestion.avgScore}
                                                    </span>
                                                    <span className="text-[10px] text-orange-400 font-medium">
                                                        {suggestion.reason === 'low_score' ? 'Consistently Low Quality' : 'Repetitive Pattern'}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    // Add to blacklist logic (mock for now or implement direct DB call)
                                                    const { data: { user } } = await supabase.auth.getUser();
                                                    if (user) {
                                                        const { data } = await supabase.from('alchemy_settings').select('blacklist_domains').eq('user_id', user.id).single();
                                                        const current = data?.blacklist_domains || [];
                                                        if (!current.includes(suggestion.domain)) {
                                                            await supabase.from('alchemy_settings').update({
                                                                blacklist_domains: [...current, suggestion.domain]
                                                            }).eq('user_id', user.id);
                                                        }
                                                        // Remove from list
                                                        setBlacklistSuggestions(prev => prev.filter(p => p.domain !== suggestion.domain));
                                                    }
                                                }}
                                                className="px-4 py-2 bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white rounded-lg text-xs font-bold transition-all border border-orange-500/20"
                                            >
                                                Blacklist Domain
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Errors Modal */}
                {showErrorsModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-bg border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
                        >
                            <div className="p-6 border-b border-border flex items-center justify-between bg-surface/30">
                                <div>
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <XCircle className="text-error" />
                                        Recent Errors
                                    </h3>
                                    <p className="text-sm text-fg/60">Log of recent failures and issues.</p>
                                </div>
                                <button
                                    onClick={() => setShowErrorsModal(false)}
                                    className="p-2 hover:bg-surface rounded-lg transition-colors"
                                >
                                    <XCircle size={20} className="text-fg/40" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-surface/10 space-y-3">
                                {errorEvents.length === 0 ? (
                                    <div className="text-center py-12 text-fg/40">
                                        <CheckCircle size={32} className="mx-auto mb-4 text-success opacity-50" />
                                        <p>No recent errors found.</p>
                                    </div>
                                ) : (
                                    errorEvents.map((error, idx) => (
                                        <div key={idx} className="glass p-4 rounded-xl border border-error/20 bg-error/5 flex items-start gap-3">
                                            <AlertCircle size={16} className="text-error mt-0.5 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-mono text-fg/40">
                                                        {new Date(error.created_at).toLocaleString()}
                                                    </span>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-error">
                                                        {error.agent_state}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-mono text-fg/90 break-words">{error.message}</p>
                                                {error.details && Object.keys(error.details).length > 0 && (
                                                    <pre className="mt-2 p-2 bg-black/20 rounded text-[10px] text-fg/60 overflow-x-auto">
                                                        {JSON.stringify(error.details, null, 2)}
                                                    </pre>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}

            </AnimatePresence>

            {/* Signals Modal */}
            <AnimatePresence>
                {showSignalsModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-bg border border-border rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
                        >
                            {/* Header with Controls */}
                            <div className="p-6 border-b border-border bg-surface/30 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold flex items-center gap-2">
                                            <Zap className="text-primary" />
                                            Found Signals
                                        </h3>
                                        <p className="text-sm text-fg/60">Browse and manage your mined signals history.</p>
                                    </div>
                                    <button
                                        onClick={() => setShowSignalsModal(false)}
                                        className="p-2 hover:bg-surface rounded-lg transition-colors"
                                    >
                                        <XCircle size={20} className="text-fg/40" />
                                    </button>
                                </div>

                                {/* Filters Bar */}
                                <div className="flex items-center gap-4">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            placeholder="Search signals..."
                                            className="w-full bg-surface/50 border border-border/20 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none"
                                            value={signalsSearch}
                                            onChange={(e) => {
                                                setSignalsSearch(e.target.value);
                                                setSignalsPage(0); // Reset to first page
                                            }}
                                            onKeyDown={(e) => e.key === 'Enter' && fetchRecentSignals(0)}
                                        />
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-fg/40" />
                                    </div>

                                    <select
                                        className="bg-surface/50 border border-border/20 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
                                        value={signalsScoreFilter || 'all'}
                                        onChange={(e) => {
                                            setSignalsScoreFilter(e.target.value);
                                            setSignalsPage(0);
                                        }}
                                    >
                                        <option value="all">Any Score</option>
                                        <option value="high">High (80%+)</option>
                                        <option value="medium">Medium (50-79%)</option>
                                        <option value="low">Low (&lt;50%)</option>
                                    </select>

                                    <select
                                        className="bg-surface/50 border border-border/20 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
                                        value={signalsFilter || ''}
                                        onChange={(e) => {
                                            setSignalsFilter(e.target.value || null);
                                            setSignalsPage(0);
                                        }}
                                    >
                                        <option value="">All Categories</option>
                                        <option value="AI & ML">AI & ML</option>
                                        <option value="Technology">Technology</option>
                                        <option value="Business">Business</option>
                                        <option value="Finance">Finance</option>
                                        <option value="Politics">Politics</option>
                                        <option value="Science">Science</option>
                                        <option value="Crypto">Crypto</option>
                                        <option value="Other">Other</option>
                                    </select>

                                    <div className="flex items-center gap-2 border-l border-border/10 pl-4">
                                        <button
                                            disabled={signalsPage === 0}
                                            onClick={() => setSignalsPage(p => Math.max(0, p - 1))}
                                            className="p-2 hover:bg-surface rounded-lg disabled:opacity-30 transition-colors"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <span className="text-xs font-mono text-fg/50 w-16 text-center">
                                            Page {signalsPage + 1}
                                        </span>
                                        <button
                                            disabled={recentSignals.length < 20}
                                            onClick={() => setSignalsPage(p => p + 1)}
                                            className="p-2 hover:bg-surface rounded-lg disabled:opacity-30 transition-colors"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-surface/10">
                                {loadingSignals ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    </div>
                                ) : recentSignals.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-fg/40 gap-4">
                                        <div className="w-16 h-16 rounded-full bg-surface/50 flex items-center justify-center">
                                            <Zap size={32} className="opacity-50" />
                                        </div>
                                        <p>No signals found matching your criteria.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {recentSignals.map((signal) => (
                                            <SignalCard
                                                key={signal.id}
                                                signal={signal}
                                                onOpen={(url) => window.open(url, '_blank')}
                                                onFavourite={async (id, current) => {
                                                    const newValue = !current;
                                                    setRecentSignals(prev => prev.map(s => s.id === id ? { ...s, is_favorite: newValue } : s));
                                                    await supabase.from('signals').update({ is_favorite: newValue }).eq('id', id);
                                                }}
                                                onBoost={async (id, current) => {
                                                    const newValue = !current;
                                                    setRecentSignals(prev => prev.map(s => s.id === id ? { ...s, is_boosted: newValue } : s));
                                                    await supabase.from('signals').update({ is_boosted: newValue }).eq('id', id);
                                                }}
                                                onDismiss={async (id, current) => {
                                                    const newValue = !current;
                                                    setRecentSignals(prev => prev.map(s => s.id === id ? { ...s, is_dismissed: newValue } : s));
                                                    await supabase.from('signals').update({ is_dismissed: newValue }).eq('id', id);
                                                }}
                                                onNote={(id, note, title) => setNoteTarget({ id, note, title })}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Note Modal */}
            {noteTarget && (
                <NoteModal
                    isOpen={!!noteTarget}
                    onClose={() => setNoteTarget(null)}
                    title={noteTarget.title}
                    initialNote={noteTarget.note}
                    onSave={async (note) => {
                        if (noteTarget) {
                            // Optimistic
                            setRecentSignals(prev => prev.map(s => s.id === noteTarget.id ? { ...s, user_notes: note } : s));
                            await supabase.from('signals').update({ user_notes: note }).eq('id', noteTarget.id);
                            setNoteTarget(null);
                        }
                    }}
                />
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {syncRuns.length === 0 ? (
                    <div className="text-center py-12 text-fg/40">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No sync runs yet</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {syncRuns.map((run) => (
                            <div key={run.id} className="glass rounded-xl overflow-hidden">
                                {/* Level 1: Sync Run */}
                                <button
                                    onClick={() => handleRunClick(run.id)}
                                    className="w-full p-4 flex items-center gap-4 hover:bg-surface/50 transition-colors text-left"
                                >
                                    {selectedRun === run.id ? (
                                        <ChevronDown className="w-5 h-5 text-primary shrink-0" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-fg/40 shrink-0" />
                                    )}

                                    {getStatusIcon(run.status)}

                                    <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                                        <div>
                                            <div className="text-xs text-fg/40 uppercase tracking-wider">Timestamp</div>
                                            <div className="text-sm font-mono">
                                                {new Date(run.started_at).toLocaleString([], {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-xs text-fg/40 uppercase tracking-wider">Duration</div>
                                            <div className="text-sm font-mono">{formatDuration(run.duration_ms)}</div>
                                        </div>

                                        <div>
                                            <div className="text-xs text-fg/40 uppercase tracking-wider">Signals</div>
                                            <div className="text-sm font-semibold text-primary">{run.signals_found}</div>
                                        </div>

                                        <div>
                                            <div className="text-xs text-fg/40 uppercase tracking-wider">Skipped</div>
                                            <div className="text-sm font-semibold text-fg/60">{run.skipped}</div>
                                        </div>

                                        <div>
                                            <div className="text-xs text-fg/40 uppercase tracking-wider">URLs</div>
                                            <div className="text-sm font-semibold">{run.urls_processed}</div>
                                        </div>

                                        <div>
                                            <div className="text-xs text-fg/40 uppercase tracking-wider">Errors</div>
                                            <div className={`text-sm font-semibold ${run.errors > 0 ? 'text-error' : 'text-fg/40'}`}>
                                                {run.errors}
                                            </div>
                                        </div>
                                    </div>
                                </button>

                                {/* Level 2: Sources */}
                                <AnimatePresence>
                                    {selectedRun === run.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="border-t border-border overflow-hidden"
                                        >
                                            <div className="p-4 bg-surface/30 space-y-2">
                                                {loadingDetails ? (
                                                    <div className="flex items-center justify-center py-8">
                                                        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                                    </div>
                                                ) : sourceDetails.length === 0 ? (
                                                    <div className="text-center py-4 text-fg/40 text-sm">No source details available</div>
                                                ) : (
                                                    sourceDetails.map((source, idx) => (
                                                        <div key={idx} className="glass rounded-lg overflow-hidden">
                                                            <button
                                                                onClick={() => handleSourceClick(source.label)}
                                                                className="w-full p-3 flex items-center gap-3 hover:bg-surface/50 transition-colors text-left"
                                                            >
                                                                {selectedSource === source.label ? (
                                                                    <ChevronDown className="w-4 h-4 text-primary shrink-0" />
                                                                ) : (
                                                                    <ChevronRight className="w-4 h-4 text-fg/40 shrink-0" />
                                                                )}

                                                                <div className="flex-1 flex items-center gap-4">
                                                                    <div className="flex-1">
                                                                        <div className="text-sm font-semibold">{source.label}</div>
                                                                        <div className="text-xs text-fg/40">{source.browser}</div>
                                                                    </div>

                                                                    <div className="text-right">
                                                                        <div className="text-xs text-fg/40">URLs Found</div>
                                                                        <div className="text-sm font-semibold">{source.urls_found}</div>
                                                                    </div>

                                                                    <div className="text-right">
                                                                        <div className="text-xs text-fg/40">Duration</div>
                                                                        <div className="text-sm font-mono">{formatDuration(source.duration_ms)}</div>
                                                                    </div>
                                                                </div>
                                                            </button>

                                                            {/* Level 3: URLs */}
                                                            <AnimatePresence>
                                                                {selectedSource === source.label && (
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: 'auto', opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        transition={{ duration: 0.2 }}
                                                                        className="border-t border-border overflow-hidden"
                                                                    >
                                                                        <div className="p-3 bg-surface/50 max-h-96 overflow-y-auto custom-scrollbar space-y-1">
                                                                            {urlResults.filter(u => u.source_label === source.label).length === 0 ? (
                                                                                <div className="text-center py-4 text-fg/40 text-xs">No URL details available for this source</div>
                                                                            ) : (
                                                                                urlResults
                                                                                    .filter(u => u.source_label === source.label)
                                                                                    .map((urlResult, urlIdx) => (
                                                                                        <div key={urlIdx} className="flex items-center gap-2 p-2 rounded bg-surface/30 hover:bg-surface/50 transition-colors">
                                                                                            {getResultIcon(urlResult.result)}

                                                                                            <div className="flex-1 min-w-0">
                                                                                                <div className="text-xs font-mono truncate text-fg/80">
                                                                                                    {urlResult.url}
                                                                                                </div>
                                                                                                {urlResult.result === 'signal' && (
                                                                                                    <div className="text-[10px] text-primary">
                                                                                                        Signal ({urlResult.score}%) - {urlResult.category}
                                                                                                    </div>
                                                                                                )}
                                                                                                {urlResult.result === 'skipped' && (
                                                                                                    <div className="text-[10px] text-fg/40">
                                                                                                        Skipped ({urlResult.score}%) - {urlResult.reason}
                                                                                                    </div>
                                                                                                )}
                                                                                                {urlResult.result === 'error' && (
                                                                                                    <div className="text-[10px] text-error">
                                                                                                        Error: {urlResult.reason}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>

                                                                                            <a
                                                                                                href={urlResult.url}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                className="p-1 hover:bg-surface rounded"
                                                                                                onClick={(e) => e.stopPropagation()}
                                                                                            >
                                                                                                <ExternalLink className="w-3 h-3 text-fg/40" />
                                                                                            </a>
                                                                                        </div>
                                                                                    ))
                                                                            )}
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
