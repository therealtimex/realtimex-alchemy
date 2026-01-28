import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2 } from 'lucide-react';
import { Engine } from '../lib/types';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

interface EngineEditorModalProps {
    engine: Engine | null;
    onClose: () => void;
    onSave: (engine: Engine) => void;
    onDelete?: (id: string) => void;
}

export function EngineEditorModal({ engine, onClose, onSave, onDelete }: EngineEditorModalProps) {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [formData, setFormData] = useState({
        title: '',
        type: 'newsletter' as Engine['type'],
        status: 'active' as Engine['status'],
        config: {
            schedule: '',
            min_score: 70,
            categories: [] as string[],
            custom_prompt: '',
            max_signals: 10,
            execution_mode: 'local' as 'local' | 'desktop'
        }
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (engine) {
            setFormData({
                title: engine.title,
                type: engine.type,
                status: engine.status,
                config: {
                    schedule: engine.config.schedule || '',
                    min_score: engine.config.filters?.min_score || 70,
                    categories: Array.isArray(engine.config.category) ? engine.config.category : (engine.config.category ? [engine.config.category] : []),
                    custom_prompt: engine.config.custom_prompt || '',
                    max_signals: engine.config.max_signals || 10,
                    execution_mode: engine.config.execution_mode || 'local'
                }
            });
        }
    }, [engine]);

    const handleSave = async () => {
        try {
            const payload = {
                title: formData.title,
                type: formData.type,
                status: formData.status,
                config: {
                    schedule: formData.config.schedule,
                    filters: {
                        min_score: formData.config.min_score,
                        category: formData.config.category
                    },
                    custom_prompt: formData.config.custom_prompt,
                    max_signals: formData.config.max_signals,
                    execution_mode: formData.config.execution_mode
                }
            };

            if (engine) {
                // Update existing
                const { data, error } = await supabase
                    .from('engines')
                    .update(payload)
                    .eq('id', engine.id)
                    .select()
                    .single();

                if (error) throw error;
                onSave(data as Engine);
                showToast('Engine updated successfully', 'success');
            } else {
                // Create new
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('Not authenticated');

                const { data, error } = await supabase
                    .from('engines')
                    .insert({ ...payload, user_id: user.id })
                    .select()
                    .single();

                if (error) throw error;
                onSave(data as Engine);
                showToast('Engine created successfully', 'success');
            }
            onClose();
        } catch (error: any) {
            console.error('Save error:', error);
            showToast(error.message || 'Failed to save engine', 'error');
        }
    };

    const handleDelete = async () => {
        if (!engine || !onDelete) return;

        try {
            const { error } = await supabase
                .from('engines')
                .delete()
                .eq('id', engine.id);

            if (error) throw error;
            onDelete(engine.id);
            showToast('Engine deleted', 'success');
            onClose();
        } catch (error: any) {
            showToast(error.message || 'Failed to delete engine', 'error');
        }
    };

    const handleClose = () => {
        setShowDeleteConfirm(false);
        onClose();
    };

    if (!engine && !onClose) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {engine ? t('transmute.edit_engine') : t('transmute.create_engine')}
                        </h3>
                        <button
                            onClick={handleClose}
                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('transmute.engine_name')}
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="e.g., Daily Tech Brief"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('transmute.type')}
                                    </label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as Engine['type'] })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    >
                                        <option value="newsletter">{t('transmute.newsletter')}</option>
                                        <option value="thread">{t('transmute.thread')}</option>
                                        <option value="audio">Audio Brief</option>
                                        <option value="report">Report</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('transmute.status')}
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as Engine['status'] })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    >
                                        <option value="active">{t('common.status_active')}</option>
                                        <option value="paused">{t('common.status_paused')}</option>
                                        <option value="draft">Draft</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('transmute.execution_env')}
                                </label>
                                <select
                                    value={formData.config.execution_mode}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        config: { ...formData.config, execution_mode: e.target.value as 'local' | 'desktop' }
                                    })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                >
                                    <option value="local">{t('transmute.local_llm')}</option>
                                    <option value="desktop">{t('transmute.desktop_swarm')}</option>
                                </select>
                                <p className="text-[10px] text-gray-500 mt-1">
                                    {formData.config.execution_mode === 'desktop'
                                        ? t('transmute.env_desc_desktop')
                                        : t('transmute.env_desc_local')}
                                </p>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="space-y-4">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">Signal Filters</h4>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('transmute.min_score')}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={formData.config.min_score}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            config: { ...formData.config, min_score: parseInt(e.target.value) || 0 }
                                        })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('transmute.max_signals')}
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={formData.config.max_signals}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            config: { ...formData.config, max_signals: parseInt(e.target.value) || 10 }
                                        })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('transmute.category_filter')}
                                </label>
                                <select
                                    multiple
                                    value={formData.config.categories}
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        setFormData({
                                            ...formData,
                                            config: { ...formData.config, categories: selected }
                                        });
                                    }}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[100px]"
                                >
                                    <option value="AI & ML">AI & ML</option>
                                    <option value="Technology">Technology</option>
                                    <option value="Business">Business</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Science">Science</option>
                                    <option value="Politics">Politics</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">{t('transmute.multi_select_hint')}</p>
                            </div>
                        </div>

                        {/* Schedule */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('transmute.schedule')} ({t('common.optional')})
                            </label>
                            <input
                                type="text"
                                value={formData.config.schedule}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    config: { ...formData.config, schedule: e.target.value }
                                })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                placeholder="e.g., Daily @ 9am, Manual"
                            />
                            <p className="text-xs text-gray-500 mt-1">{t('transmute.schedule_hint')}</p>
                        </div>

                        {/* Custom Prompt */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('transmute.prompt_override')}
                            </label>
                            <textarea
                                value={formData.config.custom_prompt}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    config: { ...formData.config, custom_prompt: e.target.value }
                                })}
                                rows={4}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                                placeholder={t('transmute.prompt_placeholder')}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                        {engine && onDelete ? (
                            showDeleteConfirm ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-red-600 font-medium">{t('transmute.delete_confirm')}</span>
                                    <button
                                        onClick={handleDelete}
                                        className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        {t('transmute.confirm')}
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-xs rounded-lg"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    {t('common.delete')}
                                </button>
                            )
                        ) : (
                            <div />
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                Save
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
