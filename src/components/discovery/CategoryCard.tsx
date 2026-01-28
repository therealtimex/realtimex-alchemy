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
}

export function CategoryCard({ category, signalCount, latestTimestamp, onClick }: CategoryCardProps) {
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
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="bg-surface/50 backdrop-blur-sm border border-border rounded-lg p-6 cursor-pointer hover:border-[var(--border-hover)] transition-all duration-300 text-left w-full relative z-0 hover:z-10"
        >
            {/* Icon */}
            <div className="mb-4">
                <IconComponent size={40} className="text-current opacity-80" />
            </div>

            {/* Category Name */}
            <h3 className="text-lg font-semibold mb-3 text-fg">{t(`common.categories.${category.id}`, category.name)}</h3>

            {/* Stats */}
            <div className="flex items-center justify-between text-sm">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(category.color)}`}>
                    {t('discovery.sources_count', { count: signalCount })}
                </span>
                <span className="text-fg/40 flex items-center gap-1 text-xs">
                    <Clock size={12} />
                    {formatTimestamp(latestTimestamp)}
                </span>
            </div>
        </motion.button>
    )
}
