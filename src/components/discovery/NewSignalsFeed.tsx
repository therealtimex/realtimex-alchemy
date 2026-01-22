import { Signal } from '../../lib/types'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { useState, useEffect } from 'react'

interface NewSignalsFeedProps {
    signals: Signal[]
    limit?: number
    onSignalClick: (id: string) => void
}

export function NewSignalsFeed({ signals, limit = 10, onSignalClick }: NewSignalsFeedProps) {
    const recentSignals = signals.slice(0, limit)
    const [isExpanded, setIsExpanded] = useState(() => {
        const saved = localStorage.getItem('newSignalsFeedExpanded')
        return saved !== null ? saved === 'true' : true
    })

    useEffect(() => {
        localStorage.setItem('newSignalsFeedExpanded', String(isExpanded))
    }, [isExpanded])

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30'
        if (score >= 50) return 'bg-blue-400/20 text-blue-400 border-blue-400/30'
        return 'bg-gray-400/20 text-gray-400 border-gray-400/30'
    }

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)

        if (minutes < 1) return 'Just now'
        if (minutes < 60) return `${minutes}m ago`
        if (hours < 24) return `${hours}h ago`
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    if (recentSignals.length === 0) {
        return null
    }

    return (
        <div className="mb-3">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between mb-2 px-1 py-1 hover:bg-surface/30 rounded-lg transition-colors"
            >
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-fg/70 uppercase tracking-wide">
                        New Signals ({recentSignals.length})
                    </h3>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-fg/40" /> : <ChevronDown size={16} className="text-fg/40" />}
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden py-3"
                    >
                        <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-on-hover">
                            <div className="flex gap-3 min-w-max">
                                {recentSignals.map((signal) => (
                                    <motion.button
                                        key={signal.id}
                                        onClick={() => onSignalClick(signal.id)}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="flex-shrink-0 w-[120px] bg-surface/50 backdrop-blur-sm border border-border rounded-lg p-3 hover:border-[var(--border-hover)] transition-all duration-300 text-left group relative z-0 hover:z-10"
                                    >
                                        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mx-auto mb-2 ${getScoreColor(signal.score)}`}>
                                            <span className="text-xl font-bold">{signal.score}</span>
                                        </div>
                                        <p className="text-xs text-fg line-clamp-2 mb-2 group-hover:text-blue-400 transition-colors">
                                            {signal.title}
                                        </p>
                                        <div className="flex items-center gap-1 text-[10px] text-fg/40">
                                            <Clock size={10} />
                                            <span>{formatTimestamp(signal.created_at)}</span>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
