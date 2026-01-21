import { useMemo } from 'react'
import { Hash } from 'lucide-react'
import { Signal } from '../../lib/types'
import { CategoryCard } from './CategoryCard'
import { CORE_CATEGORIES, OTHER_CATEGORY, matchCategory, Category } from '../../lib/categories'

interface CategoryGridProps {
    signals: Signal[]
    onCategoryClick: (categoryId: string) => void
}

const DYNAMIC_CATEGORY_THRESHOLD = 3 // Minimum signals needed to create a dynamic category

export function CategoryGrid({ signals, onCategoryClick }: CategoryGridProps) {
    const { categories, categoryCounts } = useMemo(() => {
        // Group signals by category
        const counts = new Map<string, { count: number, latest: string }>()
        const tagCounts = new Map<string, number>()

        signals.forEach(signal => {
            const tags = signal.tags || []
            const coreMatch = matchCategory(tags, signal.category)

            if (coreMatch) {
                // Matched a core category
                const existing = counts.get(coreMatch) || { count: 0, latest: signal.created_at }
                counts.set(coreMatch, {
                    count: existing.count + 1,
                    latest: signal.created_at > existing.latest ? signal.created_at : existing.latest
                })
            } else {
                // No core match - track tags for dynamic categories
                tags.forEach(tag => {
                    const tagKey = tag.toLowerCase().trim()
                    if (tagKey) {
                        tagCounts.set(tagKey, (tagCounts.get(tagKey) || 0) + 1)

                        const existing = counts.get(tagKey) || { count: 0, latest: signal.created_at }
                        counts.set(tagKey, {
                            count: existing.count + 1,
                            latest: signal.created_at > existing.latest ? signal.created_at : existing.latest
                        })
                    }
                })
            }
        })

        // Create dynamic categories from tags that meet threshold
        const dynamicCategories: Category[] = Array.from(tagCounts.entries())
            .filter(([_, count]) => count >= DYNAMIC_CATEGORY_THRESHOLD)
            .map(([tag, _]) => ({
                id: tag,
                name: tag.charAt(0).toUpperCase() + tag.slice(1), // Capitalize first letter
                icon: Hash,
                color: 'gray',
                priority: 2
            }))

        // Combine core categories, dynamic categories, and other
        const allCategories = [
            ...CORE_CATEGORIES,
            ...dynamicCategories,
            OTHER_CATEGORY
        ]

        // Filter to only categories with signals and sort by priority
        const activeCategories = allCategories
            .filter(cat => {
                const data = counts.get(cat.id)
                return data && data.count > 0
            })
            .sort((a, b) => a.priority - b.priority)

        return { categories: activeCategories, categoryCounts: counts }
    }, [signals])

    if (categories.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-fg/20">
                <p className="font-medium italic">No categories yet.</p>
                <p className="text-sm mt-2">Signals will be organized here once discovered.</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map(category => {
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
