import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Zap, FileText, Mic, Image as ImageIcon, Settings, PauseCircle, PlayCircle, Loader2 } from 'lucide-react';
import { getSupabaseConfig } from '../lib/supabase-config';
import { supabase } from '../lib/supabase';
import { Engine, Asset } from '../lib/types';
import { useToast } from '../context/ToastContext';
import { AssetPreviewModal } from './AssetPreviewModal';
import { EngineEditorModal } from './EngineEditorModal';

// Placeholder for EngineCard
const EngineCard = ({ engine, onRun, onEdit, onToggle }: { engine: Engine; onRun: (id: string) => void; onEdit: (id: string) => void; onToggle: (id: string, status: string) => void }) => {
    const iconMap = {
        newsletter: <FileText className="w-5 h-5 text-emerald-500" />,
        thread: <Zap className="w-5 h-5 text-blue-500" />,
        audio: <Mic className="w-5 h-5 text-purple-500" />,
        report: <Settings className="w-5 h-5 text-orange-500" />
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-5 rounded-2xl border ${engine.status === 'active'
                ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm'
                : 'bg-gray-50 dark:bg-gray-900 border-dashed border-gray-300 dark:border-gray-700 opacity-75'
                } transition-all hover:shadow-md group`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800">
                        {iconMap[engine.type as keyof typeof iconMap] || <FileText className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{engine.title}</h3>
                        <p className="text-xs text-gray-500 capitalize">{engine.type} Pipeline</p>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => onToggle(engine.id, engine.status)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        {engine.status === 'active' ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => onEdit(engine.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="space-y-2 mb-4">
                <div className="text-xs text-gray-500 flex justify-between">
                    <span>Last Run</span>
                    <span>{engine.last_run_at ? new Date(engine.last_run_at).toLocaleDateString() : 'Never'}</span>
                </div>
                <div className="text-xs text-gray-500 flex justify-between">
                    <span>Schedule</span>
                    <span>{engine.config.schedule || 'Manual'}</span>
                </div>
            </div>

            <button
                onClick={() => onRun(engine.id)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium hover:opacity-90 transition-opacity text-sm"
            >
                <PlayCircle className="w-4 h-4" />
                Run Engine
            </button>
        </motion.div>
    );
};

export function TransmuteTab() {
    const [engines, setEngines] = useState<Engine[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [editingEngine, setEditingEngine] = useState<Engine | null>(null);
    const [isCreatingEngine, setIsCreatingEngine] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        fetchEngines();
    }, []);

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
            showToast('Failed to load engines', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRunEngine = async (id: string) => {
        try {
            showToast('Starting engine run...', 'info');

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
            showToast(`Engine run complete! Created: ${asset.title}`, 'success');

            // Show preview immediately
            setSelectedAsset(asset as Asset);

            // Update last run time in UI locally
            setEngines(prev => prev.map(e => e.id === id ? { ...e, last_run_at: new Date().toISOString() } : e));

        } catch (error: any) {
            console.error('Engine run error:', error);
            showToast(error.message || 'Failed to run engine', 'error');
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
            showToast(`Engine ${newStatus === 'active' ? 'resumed' : 'paused'}`, 'success');
        } catch (error) {
            setEngines(prev => prev.map(e => e.id === id ? { ...e, status: currentStatus as any } : e));
            showToast('Failed to update status', 'error');
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
        <div className="h-full flex flex-col bg-gray-50/50 dark:bg-[#0A0A0A]">
            {/* Header */}
            <div className="flex-none p-6 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm z-10 sticky top-0">
                <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
                    <div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-blue-500">
                            Transmute Engine
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Active Generation Pipelines & Assets
                        </p>
                    </div>
                    <button
                        onClick={handleCreateEngine}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/10"
                    >
                        <Plus className="w-4 h-4" />
                        New Engine
                    </button>
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
                            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                                <Zap className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No Engines Configured</h3>
                            <p className="text-gray-500 max-w-sm mt-2 mb-6">
                                Create your first pipeline to automatically turn signals into newsletters, threads, or audio briefs.
                            </p>
                            <button
                                onClick={handleCreateEngine}
                                className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Create Engine
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
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

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
