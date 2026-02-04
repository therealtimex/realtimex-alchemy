import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Copy, Download, FileText, Mic, Image as ImageIcon, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Asset } from '../lib/types';

interface AssetPreviewModalProps {
    asset: Asset | null;
    onClose: () => void;
}

export function AssetPreviewModal({ asset, onClose }: AssetPreviewModalProps) {
    const { t } = useTranslation();
    const handleCopy = () => {
        if (asset?.content) {
            navigator.clipboard.writeText(asset.content);
            // Simple visual feedback could be added here
        }
    };

    const handleDownload = () => {
        if (!asset?.content) return;

        const blob = new Blob([asset.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${asset.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <AnimatePresence>
            {asset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-bg rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-border"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-border bg-surface/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                                    {asset.type === 'audio' ? <Mic className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className="font-black italic tracking-tighter uppercase text-xl text-fg">{asset.title}</h3>
                                    <p className="text-[10px] text-fg/40 font-mono uppercase tracking-widest mt-0.5">
                                        {new Date(asset.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} • {t('discovery.sources_count', { count: asset.metadata?.source_signal_count || 0 })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCopy}
                                    className="p-2.5 text-fg/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                    title="Copy Content"
                                >
                                    <Copy className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="p-2.5 text-fg/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                    title="Download File"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                                <div className="w-px h-8 bg-border mx-2" />
                                <button
                                    onClick={onClose}
                                    className="p-2.5 text-fg/40 hover:text-error hover:bg-error/10 rounded-xl transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 bg-bg custom-scrollbar">
                            {asset.status && asset.status !== 'completed' ? (
                                <div className="flex flex-col items-center justify-center h-80 gap-6">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                                        <Loader2 className="w-16 h-16 animate-spin text-primary relative z-10" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h4 className="text-xl font-black italic tracking-tighter uppercase text-fg">
                                            {asset.status === 'processing' ? t('transmute.generating_asset') : t('transmute.queued_desktop')}
                                        </h4>
                                        <p className="text-xs text-fg/40 font-mono uppercase tracking-widest max-w-xs mx-auto">
                                            {t('transmute.desktop_processing')}
                                        </p>
                                    </div>
                                </div>
                            ) : asset.type === 'markdown' ? (
                                <div className="prose prose-invert prose-headings:font-black prose-headings:italic prose-headings:tracking-tighter prose-headings:uppercase prose-p:text-fg/80 prose-li:text-fg/80 prose-strong:text-primary max-w-none">
                                    <ReactMarkdown>{asset.content || ''}</ReactMarkdown>
                                </div>
                            ) : asset.type === 'audio' ? (
                                <div className="flex flex-col items-center justify-center h-80 gap-8">
                                    <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center animate-pulse shadow-xl border border-primary/20">
                                        <Mic className="w-10 h-10 text-primary" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-fg/40 font-mono uppercase tracking-widest mb-6">{t('transmute.unsupported_type')}</p>
                                        <audio controls className="w-80 h-12 rounded-xl bg-surface border border-border">
                                            <source src={asset.content || ''} type="audio/mpeg" />
                                            Your browser does not support the audio element.
                                        </audio>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-fg/20 text-center py-20 font-mono italic">Unsupported asset type</div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
