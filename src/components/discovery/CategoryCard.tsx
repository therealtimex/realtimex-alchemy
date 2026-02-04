import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Clock, LucideIcon } from 'lucide-react'
import { getCategoryColor } from '../../lib/categories'

interface CategoryCardProps {
    category: {
        id: string
        name: string
        icon: LucideIcon
        color: string
    }
    signalCount: number
    latestTimestamp: string
    onClick: () => void
    isPulsing?: boolean
    isNew?: boolean
}

export function CategoryCard({ category, signalCount, latestTimestamp, onClick, isPulsing, isNew }: CategoryCardProps) {
    const { t } = useTranslation()
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
        return date.toLocaleDateString(t('common.locale_code', undefined), { month: 'short', day: 'numeric' })
    }

    const IconComponent = category.icon

    return (
        <motion.button
            initial={isNew ? { opacity: 0, scale: 0.95, y: -20 } : false}
            animate={
                isNew
                    ? { opacity: 1, scale: 1, y: 0 }
                    : isPulsing
                        ? { scale: [1, 1.05, 1] }
                        : { opacity: 1, scale: 1 }
            }
            transition={
                isNew
                    ? { duration: 0.5, ease: "easeOut" }
                    : isPulsing
                        ? { duration: 0.6, ease: "easeOut" }
                        : {}
            }
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`bg-surface/50 backdrop-blur-sm border rounded-lg p-6 cursor-pointer hover:border-[var(--border-hover)] transition-all duration-300 text-left w-full relative z-0 hover:z-10 ${isPulsing ? 'border-primary/50 shadow-lg shadow-primary/20' : 'border-border'
                }`}
        >
            {/* Icon */}
            <div className="mb-4">
                <IconComponent size={40} className="text-current opacity-80" />
            </div>

            {/* Category Name */}
            <h3 className="text-lg font-semibold mb-3 text-fg">{t(`common.categories.${category.id}`, category.name)}</h3>

            {/* Stats */}
            <div className="flex items-center justify-between text-sm">
                <motion.span
                    animate={isPulsing ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                    transition={{ duration: 0.6 }}
                    className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(category.color)}`}
                >
                    {signalCount === 1
                        ? t('discovery.signal_count_one', { count: signalCount })
                        : t('discovery.signal_count_other', { count: signalCount })}
                </motion.span>
                <span className="text-fg/40 flex items-center gap-1 text-xs">
                    <Clock size={12} />
                    {formatTimestamp(latestTimestamp)}
                </span>
            </div>
        </motion.button>
    )
}
