import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';

interface ChangelogModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
    const { t } = useTranslation();
    const [changelog, setChangelog] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchChangelog();
        }
    }, [isOpen]);

    const fetchChangelog = async () => {
        setLoading(true);
        try {
            const response = await fetch('/CHANGELOG.md');
            const text = await response.text();
            setChangelog(text);
        } catch (error) {
            console.error('Failed to load changelog:', error);
            setChangelog(`# ${t('common.error')}\n\n${t('shell.changelog_error')}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="glass w-full max-w-3xl max-h-[80vh] overflow-hidden pointer-events-auto shadow-2xl">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <BookOpen size={24} className="text-primary" />
                                    <h2 className="text-xl font-bold">{t('shell.release_notes')}</h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-surface rounded-lg transition-colors"
                                >
                                    <X size={20} className="text-fg/60" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto custom-scrollbar max-h-[calc(80vh-88px)]">
                                {loading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                                    </div>
                                ) : (
                                    <ReactMarkdown
                                        components={{
                                            h1: ({ children }) => (
                                                <h1 className="text-2xl font-bold text-fg mb-6 mt-0">{children}</h1>
                                            ),
                                            h2: ({ children }) => (
                                                <h2 className="text-xl font-bold text-fg mt-8 mb-3 pb-2 border-b border-border first:mt-0">{children}</h2>
                                            ),
                                            h3: ({ children }) => (
                                                <h3 className="text-lg font-bold text-primary mt-6 mb-2">{children}</h3>
                                            ),
                                            p: ({ children }) => (
                                                <p className="text-sm text-fg/70 mb-3 leading-relaxed">{children}</p>
                                            ),
                                            ul: ({ children }) => (
                                                <ul className="list-none space-y-1 mb-4 ml-0">{children}</ul>
                                            ),
                                            li: ({ children }) => (
                                                <li className="text-sm text-fg/80 ml-4 mb-1 before:content-['•'] before:mr-2 before:text-primary">{children}</li>
                                            ),
                                            a: ({ href, children }) => (
                                                <a
                                                    href={href}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:text-primary/80 underline transition-colors"
                                                >
                                                    {children}
                                                </a>
                                            ),
                                            code: ({ children }) => (
                                                <code className="bg-surface/50 text-accent px-1.5 py-0.5 rounded text-xs font-mono border border-border">
                                                    {children}
                                                </code>
                                            ),
                                            strong: ({ children }) => (
                                                <strong className="font-bold text-fg">{children}</strong>
                                            ),
                                        }}
                                    >
                                        {changelog}
                                    </ReactMarkdown>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
