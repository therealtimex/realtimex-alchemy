import { useMemo } from 'react'
import { Hash } from 'lucide-react'
import { Signal } from '../../lib/types'
import { CategoryCard } from './CategoryCard'
import { CORE_CATEGORIES, OTHER_CATEGORY, matchCategory, Category } from '../../lib/categories'

interface CategoryGridProps {
    signals: Signal[]
    categoryCounts?: Record<string, { count: number, latest: string }> // Pre-computed counts from parent
    onCategoryClick: (categoryId: string) => void
}

const DYNAMIC_CATEGORY_THRESHOLD = 3 // Minimum signals needed to create a dynamic category

// Tags that should NEVER become dynamic categories (junk from gated/navigation pages)
const BLOCKED_TAGS = new Set([
    // Authentication/Login (include variations)
    'login', 'log in', 'log-in', 'signin', 'sign in', 'sign-in', 'signup', 'sign up', 'sign-up',
    'authentication', 'auth', 'password', 'register', 'registration', 'create account',
    'forgot password', 'login page', 'oauth', 'sso', 'two-factor', '2fa',

    // Navigation/UI
    'navigation', 'menu', 'footer', 'header', 'sidebar', 'nav', 'breadcrumb',
    'cookie', 'cookies', 'consent', 'privacy', 'terms', 'sitemap', 'ui', 'ux',
    'user interface', 'interface', 'button', 'form', 'modal', 'popup', 'banner',

    // Platforms & Products (not content topics)
    'facebook', 'meta', 'instagram', 'twitter', 'x', 'linkedin', 'tiktok', 'youtube',
    'google', 'google drive', 'google docs', 'gmail', 'apple', 'icloud',
    'microsoft', 'office', 'outlook', 'teams', 'pinterest', 'reddit', 'whatsapp',
    'messenger', 'slack', 'discord', 'zoom', 'dropbox', 'notion', 'figma',
    'github', 'gitlab', 'bitbucket', 'aws', 'azure', 'vercel', 'netlify',

    // Social media generic
    'social media', 'social network', 'social', 'share', 'like', 'follow', 'post',

    // Errors/Empty
    'error', 'not found', '404', '403', '500', 'access denied', 'no content', 'empty',
    'page not found', 'unavailable', 'blocked', 'forbidden', 'unauthorized',

    // Generic junk
    'website', 'web page', 'webpage', 'page', 'site', 'web', 'app', 'application',
    'download', 'install', 'home', 'homepage', 'main', 'index', 'default',
    'about', 'contact', 'help', 'support', 'faq', 'blog', 'news', 'article',
])

// Normalize similar tags to a canonical form
const TAG_NORMALIZATION: Record<string, string> = {
    // AI/ML variations
    'ai': 'artificial intelligence',
    'ml': 'machine learning',
    'llm': 'large language models',
    'llms': 'large language models',
    'gpt': 'large language models',
    'genai': 'generative ai',
    'gen ai': 'generative ai',

    // Tech terms
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'api': 'apis',
    'apis': 'apis',
    'saas': 'software as a service',
    'iot': 'internet of things',
    'ar': 'augmented reality',
    'vr': 'virtual reality',
    'xr': 'extended reality',

    // Business
    'vc': 'venture capital',
    'pe': 'private equity',
    'ipo': 'initial public offering',
    'm&a': 'mergers and acquisitions',
    'b2b': 'business to business',
    'b2c': 'business to consumer',

    // Crypto
    'btc': 'bitcoin',
    'eth': 'ethereum',
    'nft': 'nfts',
    'nfts': 'nfts',
    'defi': 'decentralized finance',
    'web3': 'web3',

    // Common abbreviations
    'infosec': 'cybersecurity',
    'security': 'cybersecurity',
    'devops': 'devops',
    'dev': 'development',
}

function normalizeTag(tag: string): string {
    const lower = tag.toLowerCase().trim()
    return TAG_NORMALIZATION[lower] || lower
}

function isBlockedTag(tag: string): boolean {
    const lower = tag.toLowerCase().trim()
    // Check exact match
    if (BLOCKED_TAGS.has(lower)) return true
    // Check if tag contains any blocked term (for compound tags like "google drive api")
    for (const blocked of BLOCKED_TAGS) {
        if (lower === blocked || (blocked.length > 3 && lower.startsWith(blocked + ' '))) {
            return true
        }
    }
    return false
}

export function CategoryGrid({ signals, categoryCounts: externalCounts, onCategoryClick }: CategoryGridProps) {
    const { categories, finalCounts } = useMemo(() => {
        // Use external counts for core categories (from full DB query)
        // This ensures all core categories show up even if not in the limited signals list
        const counts = new Map<string, { count: number, latest: string }>()

        // First, populate from external counts (covers ALL signals in DB)
        if (externalCounts) {
            // Map category names to core category IDs
            CORE_CATEGORIES.forEach(coreCat => {
                // Check both by ID and by name (lowercase)
                const byId = externalCounts[coreCat.id]
                const byName = externalCounts[coreCat.name.toLowerCase()]
                const data = byId || byName
                if (data && data.count > 0) {
                    counts.set(coreCat.id, data)
                }
            })
            // Also handle "other"
            if (externalCounts['other'] && externalCounts['other'].count > 0) {
                counts.set('other', externalCounts['other'])
            }
        }

        // Track dynamic categories from the current signals' tags
        const tagCounts = new Map<string, number>()

        signals.forEach(signal => {
            const tags = signal.tags || []
            const coreMatch = matchCategory(tags, signal.category)

            // If no external counts, also count core categories from signals
            if (!externalCounts && coreMatch) {
                const existing = counts.get(coreMatch) || { count: 0, latest: signal.created_at }
                counts.set(coreMatch, {
                    count: existing.count + 1,
                    latest: signal.created_at > existing.latest ? signal.created_at : existing.latest
                })
            }

            // Always track tags for dynamic categories (from current signals)
            if (!coreMatch) {
                tags.forEach(tag => {
                    if (!tag || isBlockedTag(tag)) return
                    const tagKey = normalizeTag(tag)
                    if (!tagKey || isBlockedTag(tagKey)) return

                    tagCounts.set(tagKey, (tagCounts.get(tagKey) || 0) + 1)

                    const existing = counts.get(tagKey) || { count: 0, latest: signal.created_at }
                    counts.set(tagKey, {
                        count: existing.count + 1,
                        latest: signal.created_at > existing.latest ? signal.created_at : existing.latest
                    })
                })
            }
        })

        // Create dynamic categories from tags that meet threshold
        const dynamicCategories: Category[] = Array.from(tagCounts.entries())
            .filter(([_, count]) => count >= DYNAMIC_CATEGORY_THRESHOLD)
            .map(([tag, _]) => ({
                id: tag,
                name: tag.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
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

        return { categories: activeCategories, finalCounts: counts }
    }, [signals, externalCounts])

    if (categories.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-fg/20">
                <p className="font-medium italic">No categories yet.</p>
                <p className="text-sm mt-2">Signals will be organized here once discovered.</p>
            </div>
        )
    }
    
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
            {categories.map(category => {
                const data = finalCounts.get(category.id)!
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
