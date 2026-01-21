import { useMemo } from 'react'
import { Signal } from '../../lib/types'
import { CategoryCard } from './CategoryCard'
import { PRIMARY_CATEGORIES, matchCategory } from '../../lib/categories'

interface CategoryGridProps {
    signals: Signal[]
    onCategoryClick: (categoryId: string) => void
}

export function CategoryGrid({ signals, onCategoryClick }: CategoryGridProps) {
    const categoryCounts = useMemo(() => {
        // Group signals by category
        const counts = new Map<string, { count: number, latest: string }>()

        signals.forEach(signal => {
            // Determine which categories this signal belongs to
            const tags = signal.tags || []
            const categoryId = matchCategory(tags, signal.category)

            if (categoryId) {
                const existing = counts.get(categoryId) || { count: 0, latest: signal.created_at }
                counts.set(categoryId, {
                    count: existing.count + 1,
                    latest: signal.created_at > existing.latest ? signal.created_at : existing.latest
                })
            }

            // Also check tags for additional category matches
            tags.forEach(tag => {
                const tagLower = tag.toLowerCase()
                PRIMARY_CATEGORIES.forEach(cat => {
                    if (tagLower.includes(cat.id) || tagLower.includes(cat.name.toLowerCase())) {
                        const existing = counts.get(cat.id) || { count: 0, latest: signal.created_at }
                        counts.set(cat.id, {
                            count: existing.count + 1,
                            latest: signal.created_at > existing.latest ? signal.created_at : existing.latest
                        })
                    }
                })
            })
        })

        return counts
    }, [signals])

    // Filter out categories with no signals
    const activeCategories = PRIMARY_CATEGORIES.filter(cat => {
        const data = categoryCounts.get(cat.id)
        return data && data.count > 0
    })

    if (activeCategories.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-fg/20">
                <p className="font-medium italic">No categories yet.</p>
                <p className="text-sm mt-2">Signals will be organized here once discovered.</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {activeCategories.map(category => {
                const data = categoryCounts.get(category.id)!
                return (
                    <CategoryCard
                        key={category.id}
                        category={category}
                        signalCount={data.count}
                        latestTimestamp={data.latest}
                        onClick={() => onCategoryClick(category.id)}
                    />
                )
            })}
        </div>
    )
}
