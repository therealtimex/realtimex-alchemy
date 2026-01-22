import { Signal } from '../../lib/types'
import { motion } from 'framer-motion'
import { ExternalLink, Copy, Archive, Bookmark, Clock } from 'lucide-react'
import { useState } from 'react'
import { CORE_CATEGORIES, OTHER_CATEGORY, matchCategory } from '../../lib/categories'

interface SignalCardProps {
    signal: Signal
    onOpen?: (url: string) => void
    onCopy?: (text: string) => void
    onArchive?: (id: string) => void
    onBookmark?: (id: string) => void
}

export function SignalCard({ signal, onOpen, onCopy, onArchive, onBookmark }: SignalCardProps) {
    const [isHovered, setIsHovered] = useState(false)

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-yellow-400 border-yellow-400/30'
        if (score >= 50) return 'text-blue-400 border-blue-400/30'
        return 'text-gray-400 border-gray-400/30'
    }

    const getScoreLabel = (score: number) => {
        if (score >= 80) return 'HIGH'
        if (score >= 50) return 'MEDIUM'
        return 'LOW'
    }

    const getCategoryInfo = (category?: string, tags?: string[]) => {
        const categoryId = matchCategory(tags || [], category)
        if (categoryId) {
            const cat = CORE_CATEGORIES.find(c => c.id === categoryId)
            if (cat) return cat
        }
        return OTHER_CATEGORY
    }

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (minutes < 60) return `${minutes}m ago`
        if (hours < 24) return `${hours}h ago`
        if (days < 7) return `${days}d ago`
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    return (
        <motion.div
            whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)' }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className="bg-surface/50 backdrop-blur-sm border border-border rounded-lg p-6 flex flex-col gap-4 transition-all duration-300"
        >
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 ${getScoreColor(signal.score)}`}>
                        <span className="text-2xl font-bold">{signal.score}</span>
                        <span className="text-[10px] font-medium opacity-70">{getScoreLabel(signal.score)}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {(() => {
                        const categoryInfo = getCategoryInfo(signal.category, signal.tags)
                        const IconComponent = categoryInfo.icon
                        return (
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded border border-blue-500/30 flex items-center gap-1.5">
                                <IconComponent size={14} />
                                {categoryInfo.name}
                            </span>
                        )
                    })()}
                    <span className="text-xs text-fg/50 flex items-center gap-1">
                        <Clock size={12} />
                        {formatTimestamp(signal.created_at)}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1">
                <a
                    href={signal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-semibold text-fg hover:text-blue-400 transition-colors line-clamp-2 mb-2 block"
                    onClick={(e) => {
                        e.preventDefault()
                        onOpen?.(signal.url)
                    }}
                >
                    {signal.title}
                </a>
                <p className="text-sm text-fg/70 line-clamp-3">{signal.summary}</p>
            </div>

            {/* Entity Tags */}
            {signal.entities && signal.entities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {signal.entities.slice(0, 4).map((entity, idx) => (
                        <span
                            key={idx}
                            className="px-2 py-1 bg-white/5 text-fg/60 text-xs rounded border border-border"
                        >
                            {entity}
                        </span>
                    ))}
                    {signal.entities.length > 4 && (
                        <span className="px-2 py-1 text-fg/40 text-xs">
                            +{signal.entities.length - 4} more
                        </span>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <button
                    onClick={() => onOpen?.(signal.url)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded transition-colors text-sm"
                    title="Open URL"
                >
                    <ExternalLink size={14} />
                    <span>Open</span>
                </button>
                <button
                    onClick={() => onCopy?.(signal.summary)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded transition-colors text-sm"
                    title="Copy Summary"
                >
                    <Copy size={14} />
                    <span>Copy</span>
                </button>
                <button
                    onClick={() => onArchive?.(signal.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors text-sm"
                    title="Archive"
                >
                    <Archive size={14} />
                    <span>Archive</span>
                </button>
                {onBookmark && (
                    <button
                        onClick={() => onBookmark(signal.id)}
                        className="px-3 py-2 bg-white/5 hover:bg-yellow-500/20 hover:text-yellow-400 rounded transition-colors"
                        title="Bookmark"
                    >
                        <Bookmark size={14} />
                    </button>
                )}
            </div>
        </motion.div>
    )
}
