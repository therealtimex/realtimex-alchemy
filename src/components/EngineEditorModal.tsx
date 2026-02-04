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
                        categories: formData.config.categories
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
                    className="bg-bg rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-border"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-border bg-surface/50">
                        <div>
                            <h3 className="text-xl font-black italic tracking-tighter uppercase text-fg">
                                {engine ? t('transmute.edit_engine') : t('transmute.create_engine')}
                            </h3>
                            <p className="text-[10px] text-fg/40 font-mono uppercase tracking-[0.2em]">
                                {t('transmute.configure_pipeline')}
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 text-fg/40 hover:text-error hover:bg-error/10 rounded-xl transition-all"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                        {/* Basic Info */}
                        <div className="space-y-6">
                            <InputContainer label={t('transmute.engine_name')}>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-fg placeholder:text-fg/20 focus:border-primary/50 outline-none transition-all text-sm"
                                    placeholder="e.g., Daily Tech Brief"
                                />
                            </InputContainer>

                            <div className="grid grid-cols-2 gap-6">
                                <InputContainer label={t('transmute.type')}>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as Engine['type'] })}
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-fg focus:border-primary/50 outline-none transition-all text-sm appearance-none cursor-pointer"
                                    >
                                        <option value="newsletter">{t('transmute.newsletter')}</option>
                                        <option value="thread">{t('transmute.thread')}</option>
                                        <option value="audio">Audio Brief</option>
                                        <option value="report">Report</option>
                                    </select>
                                </InputContainer>

                                <InputContainer label={t('transmute.status')}>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as Engine['status'] })}
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-fg focus:border-primary/50 outline-none transition-all text-sm appearance-none cursor-pointer"
                                    >
                                        <option value="active">{t('common.status_active')}</option>
                                        <option value="paused">{t('common.status_paused')}</option>
                                        <option value="draft">Draft</option>
                                    </select>
                                </InputContainer>
                            </div>

                            <InputContainer label={t('transmute.execution_env')}>
                                <select
                                    value={formData.config.execution_mode}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        config: { ...formData.config, execution_mode: e.target.value as 'local' | 'desktop' }
                                    })}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-fg focus:border-primary/50 outline-none transition-all text-sm appearance-none cursor-pointer"
                                >
                                    <option value="local">{t('transmute.local_llm')}</option>
                                    <option value="desktop">{t('transmute.desktop_swarm')}</option>
                                </select>
                                <p className="text-[10px] text-fg/40 font-mono uppercase mt-2 leading-relaxed">
                                    {formData.config.execution_mode === 'desktop'
                                        ? t('transmute.env_desc_desktop')
                                        : t('transmute.env_desc_local')}
                                </p>
                            </InputContainer>
                        </div>

                        {/* Filters */}
                        <div className="space-y-6 pt-6 border-t border-border/10">
                            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-primary/60">Signal Filters</h4>

                            <div className="grid grid-cols-2 gap-6">
                                <InputContainer label={t('transmute.min_score')}>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={formData.config.min_score}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            config: { ...formData.config, min_score: parseInt(e.target.value) || 0 }
                                        })}
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-fg focus:border-primary/50 outline-none transition-all text-sm"
                                    />
                                </InputContainer>

                                <InputContainer label={t('transmute.max_signals')}>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={formData.config.max_signals}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            config: { ...formData.config, max_signals: parseInt(e.target.value) || 10 }
                                        })}
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-fg focus:border-primary/50 outline-none transition-all text-sm"
                                    />
                                </InputContainer>
                            </div>

                            <InputContainer label={t('transmute.category_filter')}>
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
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-fg focus:border-primary/50 outline-none transition-all text-sm min-h-[120px] custom-scrollbar"
                                >
                                    <option value="AI & ML">AI & ML</option>
                                    <option value="Technology">Technology</option>
                                    <option value="Business">Business</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Science">Science</option>
                                    <option value="Politics">Politics</option>
                                </select>
                                <p className="text-[10px] text-fg/40 font-mono mt-2">{t('transmute.multi_select_hint')}</p>
                            </InputContainer>
                        </div>

                        {/* Schedule */}
                        <div className="pt-6 border-t border-border/10">
                            <InputContainer label={`${t('transmute.schedule')} (${t('common.optional')})`}>
                                <input
                                    type="text"
                                    value={formData.config.schedule}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        config: { ...formData.config, schedule: e.target.value }
                                    })}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-fg placeholder:text-fg/20 focus:border-primary/50 outline-none transition-all text-sm"
                                    placeholder="e.g., Daily @ 9am, Manual"
                                />
                                <p className="text-[10px] text-fg/40 font-mono mt-2">{t('transmute.schedule_hint')}</p>
                            </InputContainer>
                        </div>

                        {/* Custom Prompt */}
                        <div className="pt-6 border-t border-border/10">
                            <InputContainer label={t('transmute.prompt_override')}>
                                <textarea
                                    value={formData.config.custom_prompt}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        config: { ...formData.config, custom_prompt: e.target.value }
                                    })}
                                    rows={5}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-fg placeholder:text-fg/20 focus:border-primary/50 outline-none transition-all text-sm resize-none custom-scrollbar"
                                    placeholder={t('transmute.prompt_placeholder')}
                                />
                            </InputContainer>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between p-6 border-t border-border bg-surface/50">
                        {engine && onDelete ? (
                            showDeleteConfirm ? (
                                <div className="flex items-center gap-4 bg-error/5 border border-error/20 px-4 py-2 rounded-2xl animate-in fade-in slide-in-from-left-2 transition-all">
                                    <span className="text-xs text-error font-bold uppercase tracking-widest">{t('transmute.delete_confirm')}</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleDelete}
                                            className="px-4 py-2 bg-error text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-error/80 transition-all shadow-lg shadow-error/20"
                                        >
                                            {t('transmute.confirm')}
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="px-4 py-2 bg-surface border border-border text-fg/40 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-bg transition-all"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="flex items-center gap-2 px-6 py-3 text-error/60 hover:text-error hover:bg-error/10 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    {t('common.delete')}
                                </button>
                            )
                        ) : (
                            <div />
                        )}

                        <div className="flex gap-4">
                            <button
                                onClick={handleClose}
                                className="px-6 py-3 text-fg/40 font-bold text-xs uppercase tracking-widest hover:text-fg hover:bg-surface rounded-2xl transition-all"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg glow-primary"
                            >
                                <Save className="w-5 h-5" />
                                {t('common.save')}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

function InputContainer({ label, children }: { label: string, children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-fg/30 ml-1">
                {label}
            </label>
            {children}
        </div>
    );
}
