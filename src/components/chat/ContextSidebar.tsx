import React from 'react';
import { X, ExternalLink, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ContextSidebarProps {
    sources: any[];
    onClose: () => void;
}

export function ContextSidebar({ sources, onClose }: ContextSidebarProps) {
    if (!sources || sources.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 300 }}
            exit={{ opacity: 0, x: 20, width: 0 }}
            className="glass rounded-2xl border border-border/40 overflow-hidden flex flex-col"
        >
            <div className="p-4 border-b border-border/10 flex items-center justify-between bg-surface/30">
                <div className="flex items-center gap-2 text-sm font-semibold text-fg/80">
                    <BookOpen size={16} className="text-secondary" />
                    <span>Relevant Context</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-surface rounded-md text-fg/40 hover:text-fg transition-colors"
                >
                    <X size={14} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {sources.map((source, idx) => (
                    <div
                        key={idx}
                        className="p-3 bg-surface/40 hover:bg-surface/60 border border-border/20 rounded-xl transition-all group"
                    >
                        {/* Source Header */}
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-1.5">
                                <span className="flex items-center justify-center w-4 h-4 bg-primary/10 text-primary text-[10px] font-bold rounded">
                                    {idx + 1}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${source.score >= 80 ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    }`}>
                                    {source.score}% Match
                                </span>
                            </div>
                            <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="opacity-0 group-hover:opacity-100 text-fg/40 hover:text-primary transition-opacity"
                            >
                                <ExternalLink size={12} />
                            </a>
                        </div>

                        {/* Title & Summary */}
                        <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-fg/90 block mb-1 hover:text-primary transition-colors line-clamp-2"
                        >
                            {source.title}
                        </a>
                        <p className="text-[10px] text-fg/50 line-clamp-3 leading-relaxed">
                            {source.summary}
                        </p>
                    </div>
                ))}
            </div>

            <div className="p-3 border-t border-border/10 bg-surface/30 text-[10px] text-center text-fg/30">
                Alchemist used these {sources.length} signals to answer
            </div>
        </motion.div>
    );
}
