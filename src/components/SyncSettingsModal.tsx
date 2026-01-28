import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calendar, RotateCcw, Save, Gauge } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

interface SyncSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SyncSettingsModal({ isOpen, onClose }: SyncSettingsModalProps) {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [syncFromDate, setSyncFromDate] = useState('');
    const [maxUrlsPerSync, setMaxUrlsPerSync] = useState(50);
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchSettings();
        }
    }, [isOpen]);

    const fetchSettings = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('alchemy_settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (data) {
            setMaxUrlsPerSync(data.max_urls_per_sync || 50);

            // Convert sync_start_date to datetime-local format if it exists
            // Otherwise, use last_sync_checkpoint as fallback
            const dateToUse = data.sync_start_date || data.last_sync_checkpoint;

            if (dateToUse) {
                const date = new Date(dateToUse);
                const pad = (n: number) => n < 10 ? '0' + n : n;
                const formatted = date.getFullYear() +
                    '-' + pad(date.getMonth() + 1) +
                    '-' + pad(date.getDate()) +
                    'T' + pad(date.getHours()) +
                    ':' + pad(date.getMinutes());
                setSyncFromDate(formatted);
            } else {
                setSyncFromDate('');
            }
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                showToast(t('discovery.login_to_save'), 'error');
                setIsSaving(false);
                return;
            }

            const { error } = await supabase
                .from('alchemy_settings')
                .update({
                    max_urls_per_sync: maxUrlsPerSync,
                    sync_start_date: syncFromDate ? new Date(syncFromDate).toISOString() : null
                })
                .eq('user_id', user.id);

            if (error) {
                showToast(`${t('common.error')}: ${error.message}`, 'error');
            } else {
                showToast(t('discovery.sync_saved'), 'success');
                onClose();
            }
        } catch (err: any) {
            showToast(`${t('common.error')}: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetCheckpoint = async () => {
        setIsResetting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                showToast(t('discovery.login_to_reset'), 'error');
                setIsResetting(false);
                return;
            }

            const { error } = await supabase
                .from('alchemy_settings')
                .update({ last_sync_checkpoint: null })
                .eq('user_id', user.id);

            if (error) {
                showToast(`${t('common.error')}: ${error.message}`, 'error');
            } else {
                showToast(t('discovery.checkpoint_reset'), 'success');
            }
        } catch (err: any) {
            showToast(`${t('common.error')}: ${err.message}`, 'error');
        } finally {
            setIsResetting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-surface border border-border/20 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border/10">
                    <h2 className="text-xl font-bold">{t('discovery.sync_settings')}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-black/10 rounded-lg transition-colors"
                        aria-label={t('common.close')}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Sync From */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            {t('discovery.sync_from')}
                        </label>
                        <input
                            type="datetime-local"
                            value={syncFromDate}
                            onChange={(e) => setSyncFromDate(e.target.value)}
                            className="w-full bg-black/20 border border-border/10 rounded-xl py-3 px-4 text-sm focus:border-primary/30 outline-none transition-all"
                        />
                        <p className="text-xs text-fg/50">
                            {t('discovery.sync_from_hint')}
                        </p>
                    </div>

                    {/* Max URLs per Sync */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-semibold flex items-center gap-2">
                                <Gauge className="w-4 h-4 text-primary" />
                                {t('discovery.urls_per_sync')}
                            </label>
                            <span className="text-sm font-mono text-primary">{maxUrlsPerSync}</span>
                        </div>
                        <input
                            type="range"
                            min="5"
                            max="200"
                            step="5"
                            value={maxUrlsPerSync}
                            onChange={(e) => setMaxUrlsPerSync(Number(e.target.value))}
                            className="w-full h-2 bg-black/20 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-xs text-fg/30 font-medium">
                            <span>{t('common.quick', 'Quick (5)')}</span>
                            <span>{t('common.balanced', 'Balanced (50)')}</span>
                            <span>{t('common.thorough', 'Thorough (200)')}</span>
                        </div>
                    </div>

                    {/* Reset Checkpoint */}
                    <div className="pt-4 border-t border-border/10">
                        <button
                            onClick={handleResetCheckpoint}
                            disabled={isResetting}
                            className="w-full px-4 py-2.5 bg-warning/10 hover:bg-warning/20 border border-warning/20 text-warning font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                        >
                            <RotateCcw size={16} className={isResetting ? 'animate-spin' : ''} />
                            {isResetting ? t('common.resetting', 'Resetting...') : t('discovery.reset_checkpoint')}
                        </button>
                        <p className="text-xs text-fg/40 mt-2 text-center">
                            {t('discovery.reset_checkpoint_hint')}
                        </p>
                    </div>

                    {/* Info */}
                    <div className="p-4 bg-primary/5 rounded-xl">
                        <p className="text-xs text-primary/60 leading-relaxed">
                            {t('discovery.sync_info')}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-border/10">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-surface hover:bg-black/10 border border-border/10 rounded-xl font-medium transition-all"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Save size={18} className={isSaving ? 'animate-spin' : ''} />
                        {isSaving ? t('common.saving') : t('discovery.save_settings')}
                    </button>
                </div>
            </div>
        </div>
    );
}
