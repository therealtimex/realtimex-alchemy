import { motion } from 'framer-motion'
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

    const IconComponent = category.icon

    return (
        <motion.button
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="bg-surface/50 backdrop-blur-sm border border-white/10 rounded-lg p-6 cursor-pointer hover:border-white/20 transition-all duration-300 text-left w-full"
        >
            {/* Icon */}
            <div className="mb-4">
                <IconComponent size={40} className="text-current opacity-80" />
            </div>

            {/* Category Name */}
            <h3 className="text-lg font-semibold mb-3 text-fg">{category.name}</h3>

            {/* Stats */}
            <div className="flex items-center justify-between text-sm">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(category.color)}`}>
                    {signalCount} {signalCount === 1 ? 'signal' : 'signals'}
                </span>
                <span className="text-fg/40 flex items-center gap-1 text-xs">
                    <Clock size={12} />
                    {formatTimestamp(latestTimestamp)}
                </span>
            </div>
        </motion.button>
    )
}
