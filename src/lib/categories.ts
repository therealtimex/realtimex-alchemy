// Primary category definitions for Discovery Tab
export const PRIMARY_CATEGORIES = [
    { id: 'ai', name: 'AI & ML', icon: '🤖', color: 'blue' },
    { id: 'business', name: 'Business', icon: '📊', color: 'purple' },
    { id: 'politics', name: 'Politics', icon: '🏛️', color: 'red' },
    { id: 'technology', name: 'Technology', icon: '💻', color: 'cyan' },
    { id: 'finance', name: 'Finance', icon: '💰', color: 'green' },
    { id: 'crypto', name: 'Crypto', icon: '₿', color: 'orange' },
    { id: 'science', name: 'Science', icon: '🔬', color: 'teal' },
    { id: 'other', name: 'Other', icon: '📌', color: 'gray' }
] as const

export type CategoryId = typeof PRIMARY_CATEGORIES[number]['id']

export function getCategoryColor(color: string): string {
    const colors: Record<string, string> = {
        blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        red: 'bg-red-500/20 text-red-400 border-red-500/30',
        cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        green: 'bg-green-500/20 text-green-400 border-green-500/30',
        orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        teal: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
        gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
    return colors[color] || colors.gray
}

export function matchCategory(tags: string[], category?: string): CategoryId | null {
    // First try exact category match
    if (category) {
        const match = PRIMARY_CATEGORIES.find(c => c.id === category.toLowerCase())
        if (match) return match.id
    }

    // Then try tag matching
    for (const tag of tags) {
        const tagLower = tag.toLowerCase()
        const match = PRIMARY_CATEGORIES.find(c =>
            tagLower.includes(c.id) ||
            tagLower.includes(c.name.toLowerCase())
        )
        if (match) return match.id
    }

    return 'other'
}
