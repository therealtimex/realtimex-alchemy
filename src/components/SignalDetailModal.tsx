import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, ExternalLink, Copy, Download, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

interface SignalDetailModalProps {
    signal: Signal | null;
    onClose: () => void;
}

export function SignalDetailModal({ signal, onClose }: SignalDetailModalProps) {
    const { t } = useTranslation();
    const [copied, setCopied] = React.useState(false);

    if (!signal) return null;

    const handleCopy = () => {
        const text = `# ${signal.title}\n\n**${t('discovery.category')}**: ${t(`common.categories.${signal.category?.toLowerCase() || 'other'}`, signal.category || 'Research')}\n**${t('discovery.intelligence_score')}**: ${signal.score}/100\n**${t('discovery.discovered')}**: ${new Date(signal.date).toLocaleDateString(t('common.locale_code', undefined))}\n**${t('discovery.sources')}**: ${signal.url || 'N/A'}\n\n## ${t('discovery.smart_summary')}\n${signal.summary}\n\n${signal.entities && signal.entities.length > 0 ? `## ${t('discovery.entities')}\n${signal.entities.map(e => `- ${e}`).join('\n')}\n` : ''}\n${signal.content ? `\n## ${t('discovery.full_content')}\n${signal.content}` : ''}`;

        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExportMarkdown = () => {
        const markdown = `# ${signal.title}\n\n**${t('discovery.category')}**: ${t(`common.categories.${signal.category?.toLowerCase() || 'other'}`, signal.category || 'Research')}\n**${t('discovery.intelligence_score')}**: ${signal.score}/100\n**${t('discovery.discovered')}**: ${new Date(signal.date).toLocaleDateString(t('common.locale_code', undefined))}\n**${t('discovery.sources')}**: ${signal.url || 'N/A'}\n\n## ${t('discovery.smart_summary')}\n${signal.summary}\n\n${signal.entities && signal.entities.length > 0 ? `## ${t('discovery.entities')}\n${signal.entities.map(e => `- ${e}`).join('\n')}\n` : ''}\n${signal.content ? `\n## ${t('discovery.full_content')}\n${signal.content}` : ''}`;

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${signal.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportJSON = () => {
        const json = JSON.stringify(signal, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `signal_${signal.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-4xl max-h-[90vh] glass flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-border/10 flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded border border-primary/20 uppercase tracking-wider">
                                    {t(`common.categories.${signal.category?.toLowerCase() || 'other'}`, signal.category || 'Research')}
                                </span>
                                <span className={`text-3xl font-black ${signal.score >= 80 ? 'text-accent' : 'text-fg/40'}`}>
                                    {signal.score}
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold leading-tight mb-2">{signal.title}</h2>
                            <p className="text-xs text-fg/40 font-mono">
                                {t('discovery.discovered')} {new Date(signal.date).toLocaleDateString(t('common.locale_code', undefined), { month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-surface rounded-lg text-fg/40 hover:text-fg transition-all"
                            aria-label={t('common.close')}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                        {/* Source URL */}
                        {signal.url && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-fg/40">{t('discovery.original_source')}</label>
                                <a
                                    href={signal.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-3 glass hover:bg-surface transition-all rounded-xl text-sm font-mono text-primary hover:text-accent group"
                                >
                                    <ExternalLink size={16} className="flex-shrink-0" />
                                    <span className="truncate">{signal.url}</span>
                                    <span className="ml-auto text-xs opacity-0 group-hover:opacity-100 transition-opacity">{t('discovery.open_link')} →</span>
                                </a>
                            </div>
                        )}

                        {/* Entities */}
                        {signal.entities && signal.entities.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-fg/40">{t('discovery.entities')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {signal.entities.map(entity => (
                                        <span
                                            key={entity}
                                            className="px-3 py-1.5 bg-surface/50 border border-border/20 rounded-lg text-sm font-medium"
                                        >
                                            {entity}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Summary */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-fg/40">{t('discovery.ai_summary')}</label>
                            <div className="p-4 glass rounded-xl">
                                <p className="text-sm leading-relaxed text-fg/80">{signal.summary}</p>
                            </div>
                        </div>

                        {/* Full Content */}
                        {signal.content && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-fg/40">{t('discovery.full_content')}</label>
                                <div className="p-4 glass rounded-xl max-h-96 overflow-y-auto custom-scrollbar">
                                    <p className="text-sm leading-relaxed text-fg/60 whitespace-pre-wrap">{signal.content}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions Footer */}
                    <div className="p-6 border-t border-border/10 flex items-center gap-3">
                        <button
                            onClick={handleCopy}
                            className="flex-1 py-3 glass hover:bg-surface transition-all rounded-xl text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                            {copied ? t('discovery.copied') : t('common.copy')}
                        </button>
                        <button
                            onClick={handleExportMarkdown}
                            className="flex-1 py-3 glass hover:bg-surface transition-all rounded-xl text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            <Download size={16} />
                            Markdown
                        </button>
                        <button
                            onClick={handleExportJSON}
                            className="flex-1 py-3 glass hover:bg-surface transition-all rounded-xl text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            <Download size={16} />
                            JSON
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
