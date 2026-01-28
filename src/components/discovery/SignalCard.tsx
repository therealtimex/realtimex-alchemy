import { Signal } from '../../lib/types'
import { motion } from 'framer-motion'
import { ExternalLink, Star, FileText, Rocket, Clock, HeartOff } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CORE_CATEGORIES, OTHER_CATEGORY, matchCategory } from '../../lib/categories'
import { SourceBadge } from '../SourceBadge'
import { SourceUrls } from '../SourceUrls'
import { HighConfidenceIndicator } from '../HighConfidenceIndicator'

interface SignalCardProps {
    signal: Signal
    onOpen?: (url: string) => void
    onFavourite?: (id: string, current: boolean) => void
    onNote?: (id: string, currentNote: string | null, title: string) => void
    onBoost?: (id: string, current: boolean) => void
    onDismiss?: (id: string, current: boolean) => void
}

export function SignalCard({ signal, onOpen, onFavourite, onNote, onBoost, onDismiss }: SignalCardProps) {
    const { t } = useTranslation()
    const [isHovered, setIsHovered] = useState(false)

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-yellow-400 border-yellow-400/30'
        if (score >= 50) return 'text-blue-400 border-blue-400/30'
        return 'text-gray-400 border-gray-400/30'
    }

    const getScoreLabel = (score: number) => {
        if (score >= 80) return t('discovery.score_high')
        if (score >= 50) return t('discovery.score_medium')
        return t('discovery.score_low')
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

        if (minutes < 60) return t('discovery.time_min_ago', { count: minutes })
        if (hours < 24) return t('discovery.time_hour_ago', { count: hours })
        if (days < 7) return t('discovery.time_day_ago', { count: days })
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }

    return (
        <motion.div
            whileHover={{ scale: 1.01, translateY: -2 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className={`relative bg-surface/50 backdrop-blur-sm border rounded-xl p-5 flex flex-col gap-4 transition-all duration-300 ${signal.is_favorite ? 'border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.1)]' : signal.is_dismissed ? 'opacity-50 grayscale' : 'border-border'}`}
        >
            {/* Source Count Badge */}
            <SourceBadge count={signal.mention_count || 1} />



            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl border ${getScoreColor(signal.score)} bg-surface`}>
                        <span className="text-xl font-bold">{signal.score}</span>
                        <span className="text-[9px] font-bold tracking-wider opacity-70">{getScoreLabel(signal.score)}</span>
                    </div>
                    <div>
                        {(() => {
                            const categoryInfo = getCategoryInfo(signal.category, signal.tags)
                            const IconComponent = categoryInfo.icon
                            return (
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded border border-primary/20 flex items-center gap-1.5 w-fit">
                                        <IconComponent size={10} />
                                        {categoryInfo.name}
                                    </span>
                                    {signal.is_boosted && (
                                        <span className="px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider rounded border border-accent/20 flex items-center gap-1 w-fit">
                                            <Rocket size={10} />
                                            {t('discovery.boosted')}
                                        </span>
                                    )}
                                    {signal.is_dismissed && (
                                        <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-wider rounded border border-red-500/20 flex items-center gap-1 w-fit">
                                            <HeartOff size={10} />
                                            {t('discovery.dismissed')}
                                        </span>
                                    )}
                                </div>
                            )
                        })()}
                        <div className="flex items-center gap-1.5 text-xs text-fg/40 font-mono">
                            <Clock size={10} />
                            {formatTimestamp(signal.created_at)}
                            {(signal.mention_count || 1) > 1 && (
                                <>
                                    <span>•</span>
                                    <span>{t('discovery.sources_count', { count: signal.mention_count })}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {onFavourite && (
                    <button
                        onClick={() => onFavourite(signal.id, !!signal.is_favorite)}
                        className={`p-2 rounded-lg transition-all ${signal.is_favorite
                            ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'
                            : 'bg-white/5 text-fg/40 hover:bg-white/10 hover:text-yellow-500'}`}
                        title={signal.is_favorite ? t('discovery.remove_favourite') : t('discovery.add_favourite')}
                    >
                        <Star size={18} fill={signal.is_favorite ? "currentColor" : "none"} />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1">
                <a
                    href={signal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-bold text-fg/90 hover:text-primary transition-colors line-clamp-2 mb-2 leading-tight block"
                    onClick={(e) => {
                        e.preventDefault()
                        onOpen?.(signal.url)
                    }}
                >
                    {signal.title}
                </a>
                <p className="text-xs text-fg/60 line-clamp-3 leading-relaxed">{signal.summary}</p>

                {/* User Note Preview */}
                {signal.user_notes && (
                    <div className="mt-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg flex gap-2">
                        <FileText size={14} className="text-yellow-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-fg/80 italic font-medium line-clamp-2">"{signal.user_notes}"</p>
                    </div>
                )}
            </div>

            {/* Entity Tags */}
            {signal.entities && signal.entities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {signal.entities.slice(0, 4).map((entity, idx) => (
                        <span
                            key={idx}
                            className="px-2 py-0.5 bg-white/5 text-fg/50 text-[10px] rounded border border-white/5"
                        >
                            {entity}
                        </span>
                    ))}
                    {signal.entities.length > 4 && (
                        <span className="px-2 py-0.5 text-fg/30 text-[10px]">
                            +{signal.entities.length - 4}
                        </span>
                    )}
                </div>
            )}

            {/* Source URLs */}
            <SourceUrls
                urls={signal.metadata?.source_urls || []}
                timestamps={signal.metadata?.timestamps || []}
            />

            {/* Actions */}
            <div className="grid grid-cols-5 gap-2 pt-2 border-t border-border/40">
                <button
                    onClick={() => onOpen?.(signal.url)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-xs font-semibold text-fg/70"
                    title={t('discovery.open_source')}
                >
                    <ExternalLink size={14} />
                    {t('discovery.open_source')}
                </button>

                {onNote && (
                    <button
                        onClick={() => onNote(signal.id, signal.user_notes || null, signal.title)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-colors text-xs font-semibold ${signal.user_notes
                            ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                            : 'bg-white/5 text-fg/70 hover:bg-white/10 hover:text-blue-400'}`}
                        title={t('discovery.add_note')}
                    >
                        <FileText size={14} />
                        {t('discovery.add_note')}
                    </button>
                )}

                {onBoost && (
                    <button
                        onClick={() => onBoost(signal.id, !!signal.is_boosted)}
                        className={`col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-colors text-xs font-semibold ${signal.is_boosted
                            ? 'bg-accent/20 text-accent hover:bg-accent/30 shadow-sm border border-accent/20'
                            : 'bg-white/5 text-fg/70 hover:bg-accent/10 hover:text-accent group'}`}
                        title={t('discovery.boost_topic')}
                    >
                        <Rocket size={14} className={signal.is_boosted ? "fill-current" : "group-hover:text-accent"} />
                        {signal.is_boosted ? t('discovery.boosted') : t('discovery.boost_topic')}
                    </button>
                )}

                {onDismiss && (
                    <button
                        onClick={() => onDismiss(signal.id, !!signal.is_dismissed)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-colors text-xs font-semibold ${signal.is_dismissed
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            : 'bg-white/5 text-fg/70 hover:bg-white/10 hover:text-red-400'}`}
                        title={t('discovery.dismiss_hint')}
                    >
                        <HeartOff size={14} />
                    </button>
                )}
            </div>
        </motion.div>
    )
}

