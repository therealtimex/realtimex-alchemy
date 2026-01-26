import { Brain, Briefcase, Landmark, Cpu, DollarSign, Bitcoin, Microscope, Tag, LucideIcon } from 'lucide-react'

// Core category definitions with Lucide icons
export const CORE_CATEGORIES = [
    { id: 'ai', name: 'AI & ML', icon: Brain, color: 'blue', priority: 1 },
    { id: 'business', name: 'Business', icon: Briefcase, color: 'purple', priority: 1 },
    { id: 'politics', name: 'Politics', icon: Landmark, color: 'red', priority: 1 },
    { id: 'technology', name: 'Technology', icon: Cpu, color: 'cyan', priority: 1 },
    { id: 'finance', name: 'Finance', icon: DollarSign, color: 'green', priority: 1 },
    { id: 'crypto', name: 'Crypto', icon: Bitcoin, color: 'orange', priority: 1 },
    { id: 'science', name: 'Science', icon: Microscope, color: 'teal', priority: 1 },
] as const

// Fallback category for uncategorized signals
export const OTHER_CATEGORY = { id: 'other', name: 'Other', icon: Tag, color: 'gray', priority: 3 }

// For backward compatibility
export const PRIMARY_CATEGORIES = [...CORE_CATEGORIES, OTHER_CATEGORY]

export type CategoryId = typeof CORE_CATEGORIES[number]['id'] | 'other' | string
export type CategoryIcon = LucideIcon

export interface Category {
    id: string
    name: string
    icon: LucideIcon
    color: string
    priority: number
}

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
    // First try exact category match (by ID or name)
    if (category) {
        const categoryLower = category.toLowerCase().trim()
        const match = CORE_CATEGORIES.find(c =>
            c.id === categoryLower ||
            c.name.toLowerCase() === categoryLower
        )
        if (match) return match.id

        // Also check "Other" category
        if (categoryLower === 'other') return 'other'
    }

    // Then try tag matching against core categories
    for (const tag of tags) {
        const tagLower = tag.toLowerCase()
        const match = CORE_CATEGORIES.find(c =>
            tagLower.includes(c.id) ||
            tagLower.includes(c.name.toLowerCase())
        )
        if (match) return match.id
    }

    return null
}
