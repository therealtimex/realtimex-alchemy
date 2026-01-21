import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronRight, ExternalLink, Zap, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SyncRun {
    id: string;
    started_at: string;
    completed_at: string;
    duration_ms: number;
    signals_found: number;
    urls_processed: number;
    skipped: number;
    errors: number;
    status: 'success' | 'failed' | 'partial';
}

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

export function SystemLogsTab() {
    const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRun, setSelectedRun] = useState<string | null>(null);
    const [selectedSource, setSelectedSource] = useState<string | null>(null);
    const [runEvents, setRunEvents] = useState<ProcessingEvent[]>([]);
    const [sourceDetails, setSourceDetails] = useState<SourceDetail[]>([]);
    const [urlResults, setUrlResults] = useState<UrlResult[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        fetchSyncRuns();
    }, []);

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
            </div>

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
                                            className="border-t border-border/10 overflow-hidden"
                                        >
                                            <div className="p-4 bg-black/10 space-y-2">
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
                                                                        className="border-t border-border/10 overflow-hidden"
                                                                    >
                                                                        <div className="p-3 bg-black/20 max-h-96 overflow-y-auto custom-scrollbar space-y-1">
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
