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
        if (asset.content) {
            navigator.clipboard.writeText(asset.content);
            // Simple visual feedback could be added here
        }
    };

    const handleDownload = () => {
        if (!asset.content) return;

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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                                    {asset.type === 'audio' ? <Mic className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{asset.title}</h3>
                                    <p className="text-xs text-gray-500">
                                        {new Date(asset.created_at).toLocaleString()} • {t('discovery.sources_count', { count: asset.metadata?.source_signal_count || 0 })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCopy}
                                    className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    title="Copy Content"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    title="Download File"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
                                <button
                                    onClick={onClose}
                                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-950">
                            {asset.status && asset.status !== 'completed' ? (
                                <div className="flex flex-col items-center justify-center h-64 gap-4">
                                    <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
                                    <div className="text-center">
                                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                            {asset.status === 'processing' ? t('transmute.generating_asset') : t('transmute.queued_desktop')}
                                        </h4>
                                        <p className="text-sm text-gray-500 max-w-xs mt-1">
                                            {t('transmute.desktop_processing')}
                                        </p>
                                    </div>
                                </div>
                            ) : asset.type === 'markdown' ? (
                                <div className="prose dark:prose-invert max-w-none">
                                    <ReactMarkdown>{asset.content || ''}</ReactMarkdown>
                                </div>
                            ) : asset.type === 'audio' ? (
                                <div className="flex flex-col items-center justify-center h-64 gap-4">
                                    <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center animate-pulse">
                                        <Mic className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <p className="text-gray-500">{t('transmute.unsupported_type')}</p>
                                    <audio controls className="w-full max-w-md mt-4">
                                        <source src={asset.content || ''} type="audio/mpeg" />
                                        Your browser does not support the audio element.
                                    </audio>
                                </div>
                            ) : (
                                <div className="text-gray-500 text-center py-10">Unsupported asset type</div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
