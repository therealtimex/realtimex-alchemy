import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Signal } from '../../lib/types'
import { SignalCard } from './SignalCard'
import { NewSignalsFeed } from './NewSignalsFeed'
import { CategoryGrid } from './CategoryGrid'
import { SignalDrawer } from './SignalDrawer'
import { supabase } from '../../lib/supabase'
import { Search, Filter, X } from 'lucide-react'

interface DiscoveryTabProps {
    onOpenUrl?: (url: string) => void
    onCopyText?: (text: string) => void
    onSync?: () => void
    isSyncing?: boolean
}

export function DiscoveryTab({ onOpenUrl, onCopyText, onSync, isSyncing }: DiscoveryTabProps) {
    const { t } = useTranslation()
    const [signals, setSignals] = useState<Signal[]>([])
    const [categoryCounts, setCategoryCounts] = useState<Record<string, { count: number, latest: string }>>({})
    const [loading, setLoading] = useState(true)
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

    // Fetch category counts (for CategoryGrid) - runs once on mount
    useEffect(() => {
        const fetchCategoryCounts = async () => {
            // Get all signals with just category and timestamp for counting
            const { data, error } = await supabase
                .from('signals')
                .select('category, created_at')
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching category counts:', error)
                return
            }

            // Aggregate counts by category
            const counts: Record<string, { count: number, latest: string }> = {}
            data?.forEach(signal => {
                const cat = signal.category?.toLowerCase() || 'other'
                if (!counts[cat]) {
                    counts[cat] = { count: 0, latest: signal.created_at }
                }
                counts[cat].count++
                if (signal.created_at > counts[cat].latest) {
                    counts[cat].latest = signal.created_at
                }
            })
            setCategoryCounts(counts)
        }

        fetchCategoryCounts()
    }, [])

    // Fetch signals from Supabase
    useEffect(() => {
        const fetchSignals = async () => {
            setLoading(true)
            let query = supabase
                .from('signals')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50)

            // Apply category filter if set
            if (categoryFilter) {
                query = query.ilike('category', categoryFilter)
            }

            // Apply search filter if set
            if (searchQuery) {
                query = query.or(`title.ilike.%${searchQuery}%,summary.ilike.%${searchQuery}%,url.ilike.%${searchQuery}%`)
            }

            const { data, error } = await query

            if (error) {
                console.error('Error fetching signals:', error)
            } else {
                setSignals(data || [])
            }
            setLoading(false)
        }

        fetchSignals()

        // Subscribe to realtime updates
        const channel = supabase
            .channel('signals')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'signals' },
                (payload) => {
                    setSignals(prev => [payload.new as Signal, ...prev])
                }
            )
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [searchQuery, categoryFilter])

    const handleOpen = (url: string) => {
        if (onOpenUrl) {
            onOpenUrl(url)
        } else {
            window.open(url, '_blank', 'noopener,noreferrer')
        }
    }

    const handleCopy = (text: string) => {
        if (onCopyText) {
            onCopyText(text)
        } else {
            navigator.clipboard.writeText(text)
        }
    }

    const handleArchive = async (id: string) => {
        await supabase.from('signals').delete().eq('id', id)
        setSignals(prev => prev.filter(s => s.id !== id))
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* New Signals Feed */}
            <div className="px-4 pt-2">
                <NewSignalsFeed
                    signals={signals}
                    limit={10}
                    onSignalClick={(id) => {
                        // Find signal's category and open drawer
                        const signal = signals.find(s => s.id === id)
                        if (signal && signal.category) {
                            setSelectedCategory(signal.category.toLowerCase())
                        }
                    }}
                />
            </div>

            {/* Filter Controls */}
            <div className="px-4 pt-1 pb-2 space-y-3">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg/40" />
                    <input
                        type="text"
                        placeholder={t('chat.ask_anything', 'Search signals...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-surface border border-border/20 rounded-xl py-3 pl-10 pr-10 text-sm text-fg placeholder:text-fg/40 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg/40 hover:text-fg transition-colors"
                            title={t('common.clear')}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-2 flex-wrap">
                    <Filter className="w-3.5 h-3.5 text-fg/40" />
                    <button
                        onClick={() => setCategoryFilter(null)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${categoryFilter === null
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-surface hover:bg-surface/80 text-fg/60 hover:text-fg border border-border/20'
                            }`}
                    >
                        {t('common.all')}
                    </button>
                    {[
                        { id: 'AI & ML', key: 'common.categories.ai_ml' },
                        { id: 'Business', key: 'common.categories.business' },
                        { id: 'Politics', key: 'common.categories.politics' },
                        { id: 'Technology', key: 'common.categories.technology' },
                        { id: 'Finance', key: 'common.categories.finance' },
                        { id: 'Crypto', key: 'common.categories.crypto' },
                        { id: 'Science', key: 'common.categories.science' },
                        { id: 'Other', key: 'common.categories.other' }
                    ].map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setCategoryFilter(cat.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${categoryFilter === cat.id
                                ? 'bg-primary text-white shadow-sm'
                                : 'bg-surface hover:bg-surface/80 text-fg/60 hover:text-fg border border-border/20'
                                }`}
                        >
                            {t(cat.key)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Category Grid OR Signal List */}
            <div className="flex-1 overflow-y-auto px-4 pb-12 scrollbar-on-hover">
                {loading ? (
                    <div className="h-64 flex items-center justify-center text-fg/30">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                    </div>
                ) : categoryFilter ? (
                    /* When a category filter is active, show signals directly */
                    <div className="space-y-4 py-2">
                        {signals.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-fg/30 gap-2">
                                <p className="italic">{t('discovery.no_signals_in_category', { category: t(`common.categories.${categoryFilter.toLowerCase()}`, categoryFilter) })}</p>
                            </div>
                        ) : (
                            signals.map(signal => (
                                <SignalCard
                                    key={signal.id}
                                    signal={signal}
                                    onOpen={handleOpen}
                                    onFavourite={async (id, current) => {
                                        const newValue = !current
                                        setSignals(prev => prev.map(s => s.id === id ? { ...s, is_favorite: newValue } : s))
                                        await supabase.from('signals').update({ is_favorite: newValue }).eq('id', id)
                                    }}
                                    onBoost={async (id, current) => {
                                        const newValue = !current
                                        setSignals(prev => prev.map(s => s.id === id ? { ...s, is_boosted: newValue } : s))
                                        await supabase.from('signals').update({ is_boosted: newValue }).eq('id', id)
                                    }}
                                    onDismiss={async (id, current) => {
                                        const newValue = !current
                                        setSignals(prev => prev.map(s => s.id === id ? { ...s, is_dismissed: newValue } : s))
                                        await supabase.from('signals').update({ is_dismissed: newValue }).eq('id', id)
                                    }}
                                />
                            ))
                        )}
                    </div>
                ) : (
                    /* When "All" is selected, show category grid */
                    <CategoryGrid
                        signals={signals}
                        externalCounts={categoryCounts}
                        onCategoryClick={(id) => setSelectedCategory(id)}
                        onSync={onSync}
                        isSyncing={isSyncing}
                    />
                )}
            </div>

            {/* Signal Drawer */}
            <SignalDrawer
                isOpen={!!selectedCategory}
                onClose={() => setSelectedCategory(null)}
                categoryId={selectedCategory || ''}
                signals={signals}
                onOpenUrl={handleOpen}
                onFavourite={async (id, current) => {
                    const newValue = !current
                    // Optimistic update
                    setSignals(prev => prev.map(s => s.id === id ? { ...s, is_favorite: newValue } : s))

                    const { error } = await supabase.from('signals').update({ is_favorite: newValue }).eq('id', id)
                    if (error) {
                        console.error('Failed to update favorite:', error)
                        // Revert on error
                        setSignals(prev => prev.map(s => s.id === id ? { ...s, is_favorite: current } : s))
                    }
                }}
                onNote={async (id, note) => {
                    // Optimistic update
                    setSignals(prev => prev.map(s => s.id === id ? { ...s, user_notes: note } : s))

                    const { error } = await supabase.from('signals').update({ user_notes: note }).eq('id', id)
                    if (error) {
                        console.error('Failed to update note:', error)
                    }
                }}
                onBoost={async (id, current) => {
                    const newValue = !current
                    // Optimistic update
                    setSignals(prev => prev.map(s => s.id === id ? { ...s, is_boosted: newValue } : s))

                    const { error } = await supabase.from('signals').update({ is_boosted: newValue }).eq('id', id)
                    if (error) {
                        console.error('Failed to update boost:', error)
                        // Revert on error
                        setSignals(prev => prev.map(s => s.id === id ? { ...s, is_boosted: current } : s))
                    }
                }}
                onDismiss={async (id, current) => {
                    const newValue = !current
                    // Optimistic update
                    setSignals(prev => prev.map(s => s.id === id ? { ...s, is_dismissed: newValue } : s))

                    const { error } = await supabase.from('signals').update({ is_dismissed: newValue }).eq('id', id)
                    if (error) {
                        console.error('Failed to update dismiss:', error)
                        // Revert on error
                        setSignals(prev => prev.map(s => s.id === id ? { ...s, is_dismissed: current } : s))
                    }
                }}
            />
        </div>
    )
}
