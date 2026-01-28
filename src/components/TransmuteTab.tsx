import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Zap, FileText, Mic, Image as ImageIcon, Settings, PauseCircle, PlayCircle, Loader2, Code, Copy, Check, X, Hash } from 'lucide-react';
import { getSupabaseConfig } from '../lib/supabase-config';
import { supabase } from '../lib/supabase';
import { Engine, Asset } from '../lib/types';
import { useToast } from '../context/ToastContext';
import { AssetPreviewModal } from './AssetPreviewModal';
import { EngineEditorModal } from './EngineEditorModal';

// Local EngineCard component
const EngineCard = ({
    engine,
    onRun,
    onEdit,
    onToggle,
    onViewBrief,
    isLoading
}: {
    engine: Engine;
    onRun: (id: string) => void;
    onEdit: (id: string) => void;
    onToggle: (id: string, status: string) => void;
    onViewBrief: (id: string) => void;
    isLoading?: boolean;
}) => {
    const { t } = useTranslation();
    const isTagBased = !!engine.config.tag;

    const iconMap = {
        newsletter: isTagBased
            ? <Hash className="w-5 h-5 text-blue-500" />
            : <FileText className="w-5 h-5 text-emerald-500" />,
        thread: <Zap className="w-5 h-5 text-blue-500" />,
        audio: <Mic className="w-5 h-5 text-purple-500" />,
        report: <Settings className="w-5 h-5 text-orange-500" />
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-5 rounded-2xl border transition-all hover:shadow-lg group ${engine.status === 'active'
                ? 'bg-surface border-border shadow-sm'
                : 'bg-surface/30 border-dashed border-border opacity-70'
                }`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-bg border border-border/10">
                        {iconMap[engine.type as keyof typeof iconMap] || <FileText className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-fg tracking-tight">{engine.title}</h3>
                        <p className="text-[10px] text-fg/40 font-mono uppercase tracking-widest">
                            {isTagBased ? t('transmute.topic') : t(`transmute.${engine.type}`, engine.type)} {t('transmute.pipeline')}
                        </p>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => onToggle(engine.id, engine.status)}
                        className="p-1.5 rounded-lg hover:bg-bg text-fg/40 hover:text-fg transition-colors"
                    >
                        {engine.status === 'active' ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => onViewBrief(engine.id)}
                        title={t('transmute.view_json')}
                        className="p-1.5 rounded-lg hover:bg-bg text-fg/40 hover:text-fg transition-colors"
                    >
                        <Code className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onEdit(engine.id)}
                        className="p-1.5 rounded-lg hover:bg-bg text-fg/40 hover:text-fg transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="space-y-2 mb-4">
                <div className="text-[10px] text-fg/40 font-mono uppercase tracking-widest flex justify-between">
                    <span>{t('transmute.last_run')}</span>
                    <span className="text-fg/60">{engine.last_run_at ? new Date(engine.last_run_at).toLocaleDateString(t('common.locale_code')) : t('transmute.never')}</span>
                </div>
                <div className="text-[10px] text-fg/40 font-mono uppercase tracking-widest flex justify-between">
                    <span>{t('transmute.schedule')}</span>
                    <span className="text-fg/60">{engine.config.schedule || t('transmute.manual')}</span>
                </div>
            </div>

            <button
                onClick={() => onRun(engine.id)}
                disabled={isLoading || engine.status !== 'active'}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white font-bold shadow-lg glow-primary hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all text-sm uppercase tracking-widest"
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <PlayCircle className="w-4 h-4" />
                )}
                {isLoading ? t('transmute.running') : t('transmute.run_engine')}
            </button>
        </motion.div>
    );
};

export function TransmuteTab() {
    const { t } = useTranslation();
    const [engines, setEngines] = useState<Engine[]>([]);
    const [loading, setLoading] = useState(true);
    const [runningEngines, setRunningEngines] = useState<Set<string>>(new Set());
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [viewingBrief, setViewingBrief] = useState<any>(null);
    const [isBriefLoading, setIsBriefLoading] = useState(false);
    const [editingEngine, setEditingEngine] = useState<Engine | null>(null);
    const [isCreatingEngine, setIsCreatingEngine] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        const init = async () => {
            fetchEngines();
        };

        init();

        // Subscribe to asset updates (for async desktop jobs)
        const assetSubscription = supabase
            .channel('asset-updates')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'assets' },
                (payload) => {
                    const updatedAsset = payload.new as Asset;

                    // If this is the asset we are currently viewing, update it
                    setSelectedAsset(prev => prev?.id === updatedAsset.id ? updatedAsset : prev);

                    // Show success toast when processing completes
                    if (updatedAsset.status === 'completed' && payload.old.status !== 'completed') {
                        showToast(t('transmute.asset_ready', { title: updatedAsset.title }), 'success');
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(assetSubscription);
        };
    }, []);

    const handleGenerateEngines = async () => {
        if (isGenerating) return;

        try {
            setIsGenerating(true);
            showToast(t('transmute.scanning'), 'info');

            const { data: { session } } = await supabase.auth.getSession();
            const config = getSupabaseConfig();

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'x-user-id': session?.user?.id || ''
            };

            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            if (config) {
                headers['x-supabase-url'] = config.url;
                headers['x-supabase-key'] = config.anonKey;
            }

            const response = await fetch('/api/engines/ensure-defaults', {
                method: 'POST',
                headers
            });

            if (!response.ok) throw new Error('Failed to generate engines');

            showToast(t('transmute.discovery_complete'), 'success');
            await fetchEngines();
        } catch (error) {
            console.error('Failed to generate engines:', error);
            showToast(t('transmute.discovery_failed'), 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const fetchEngines = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('engines')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEngines(data as Engine[]);
        } catch (error: any) {
            console.error('Error fetching engines:', error);
            showToast(t('transmute.load_failed'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRunEngine = async (id: string) => {
        if (runningEngines.has(id)) return;

        try {
            setRunningEngines(prev => new Set(prev).add(id));
            showToast(t('transmute.starting_run'), 'info');

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const config = getSupabaseConfig();

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'x-user-id': session?.user?.id || ''
            };

            if (token) headers['Authorization'] = `Bearer ${token}`;

            if (config) {
                headers['x-supabase-url'] = config.url;
                headers['x-supabase-key'] = config.anonKey;
            }

            const response = await fetch(`/api/engines/${id}/run`, {
                method: 'POST',
                headers
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Run failed');
            }

            const asset = await response.json();

            if (asset.status === 'completed') {
                showToast(t('transmute.run_complete', { title: asset.title }), 'success');
            } else {
                showToast(t('transmute.run_started_desktop', { id: asset.id }), 'info');
            }

            // Show preview immediately
            setSelectedAsset(asset as Asset);

            // Update last run time in UI locally
            setEngines(prev => prev.map(e => e.id === id ? { ...e, last_run_at: new Date().toISOString() } : e));

        } catch (error: any) {
            console.error('Engine run error:', error);
            showToast(error.message || t('transmute.run_failed'), 'error');
        } finally {
            setRunningEngines(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const handleViewBrief = async (id: string) => {
        try {
            setIsBriefLoading(true);

            const { data: { session } } = await supabase.auth.getSession();
            const config = getSupabaseConfig();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'x-user-id': session?.user?.id || ''
            };
            if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
            if (config) {
                headers['x-supabase-url'] = config.url;
                headers['x-supabase-key'] = config.anonKey;
            }

            const response = await fetch(`/api/engines/${id}/brief`, { headers });
            if (!response.ok) throw new Error('Failed to fetch brief');

            const brief = await response.json();
            setViewingBrief(brief);
        } catch (error: any) {
            showToast(t('transmute.brief_failed'), 'error');
        } finally {
            setIsBriefLoading(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'paused' : 'active';
        // Optimistic update
        setEngines(prev => prev.map(e => e.id === id ? { ...e, status: newStatus as any } : e));

        try {
            const { error } = await supabase
                .from('engines')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            showToast(t('transmute.status_updated', { status: newStatus }), 'success');
        } catch (error) {
            setEngines(prev => prev.map(e => e.id === id ? { ...e, status: currentStatus as any } : e));
            showToast(t('common.error'), 'error');
        }
    };

    const handleCreateEngine = () => {
        setIsCreatingEngine(true);
    };

    const handleEditEngine = (id: string) => {
        const engine = engines.find(e => e.id === id);
        if (engine) setEditingEngine(engine);
    };

    const handleSaveEngine = (engine: Engine) => {
        setEngines(prev => {
            const existing = prev.find(e => e.id === engine.id);
            if (existing) {
                return prev.map(e => e.id === engine.id ? engine : e);
            }
            return [engine, ...prev];
        });
    };

    const handleDeleteEngine = (id: string) => {
        setEngines(prev => prev.filter(e => e.id !== id));
    };

    const handleCloseEditor = () => {
        setEditingEngine(null);
        setIsCreatingEngine(false);
    };

    return (
        <div className="h-full flex flex-col bg-bg">
            {/* Header */}
            <div className="flex-none p-6 border-b border-border bg-bg/50 backdrop-blur-sm z-10 sticky top-0">
                <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
                    <div>
                        <h2 className="text-2xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                            {t('transmute.title')}
                        </h2>
                        <p className="text-xs text-fg/40 font-mono uppercase tracking-widest mt-1">
                            {t('transmute.desc')}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleGenerateEngines}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary/20 transition-all disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                            {t('transmute.generate_engines')}
                        </button>
                        <button
                            onClick={handleCreateEngine}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg glow-primary"
                        >
                            <Plus className="w-4 h-4" />
                            {t('transmute.new_engine')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-7xl mx-auto w-full">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                        </div>
                    ) : engines.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-96 text-center">
                            <div className="w-16 h-16 rounded-3xl bg-surface border border-border flex items-center justify-center mb-6 shadow-xl">
                                <Zap className="w-8 h-8 text-fg/20" />
                            </div>
                            <h3 className="text-xl font-black italic tracking-tighter uppercase text-fg">{t('transmute.no_engines')}</h3>
                            <p className="text-xs text-fg/40 font-mono tracking-widest uppercase max-w-sm mt-2 mb-8">
                                {t('transmute.no_engines_desc')}
                            </p>
                            <button
                                onClick={handleCreateEngine}
                                className="px-8 py-3 rounded-xl border border-border bg-surface hover:bg-bg text-xs font-bold uppercase tracking-widest transition-all shadow-sm"
                            >
                                {t('transmute.create_engine')}
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            <AnimatePresence>
                                {engines.map(engine => (
                                    <EngineCard
                                        key={engine.id}
                                        engine={engine}
                                        onRun={handleRunEngine}
                                        onEdit={handleEditEngine}
                                        onToggle={handleToggleStatus}
                                        onViewBrief={handleViewBrief}
                                        isLoading={runningEngines.has(engine.id)}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* Production Brief Modal */}
            <AnimatePresence>
                {viewingBrief && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-bg rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-border"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-border bg-surface/50">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                                        <Code className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black italic tracking-tighter uppercase text-lg text-fg">{t('transmute.view_json')}</h3>
                                        <p className="text-[10px] text-fg/40 font-mono uppercase tracking-widest">{t('transmute.json_contract')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(JSON.stringify(viewingBrief, null, 2));
                                            showToast(t('transmute.copied_json'), 'info');
                                        }}
                                        className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewingBrief(null)}
                                        className="p-2 text-fg/40 hover:text-error hover:bg-error/10 rounded-xl transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 bg-black font-mono text-sm custom-scrollbar">
                                <pre className="text-primary/80">
                                    {JSON.stringify(viewingBrief, null, 2)}
                                </pre>
                            </div>
                            <div className="p-4 border-t border-border bg-surface/50 text-[9px] text-fg/30 font-mono uppercase tracking-[0.2em] text-center">
                                {t('transmute.json_footer')}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {isBriefLoading && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/20 backdrop-blur-sm">
                    <Loader2 className="w-10 h-10 animate-spin text-white" />
                </div>
            )}

            {/* Asset Preview Modal */}
            <AssetPreviewModal
                asset={selectedAsset}
                onClose={() => setSelectedAsset(null)}
            />

            {/* Engine Editor Modal */}
            {editingEngine && (
                <EngineEditorModal
                    engine={editingEngine}
                    onClose={handleCloseEditor}
                    onSave={handleSaveEngine}
                    onDelete={handleDeleteEngine}
                />
            )}

            {/* Create Engine Modal */}
            {isCreatingEngine && (
                <EngineEditorModal
                    engine={null}
                    onClose={handleCloseEditor}
                    onSave={handleSaveEngine}
                />
            )}
        </div>
    );
}
