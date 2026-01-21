import { useState, useEffect } from 'react'
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
}

export function DiscoveryTab({ onOpenUrl, onCopyText }: DiscoveryTabProps) {
    const [signals, setSignals] = useState<Signal[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

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
            <div className="px-4 pt-3">
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
            <div className="px-4 pt-2 pb-2 space-y-3">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg/40" />
                    <input
                        type="text"
                        placeholder="Search signals by title, summary, or URL..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-surface border border-border/20 rounded-xl py-3 pl-10 pr-10 text-sm text-fg placeholder:text-fg/40 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg/40 hover:text-fg transition-colors"
                            title="Clear search"
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
                        All
                    </button>
                    {['AI & ML', 'Business', 'Politics', 'Technology', 'Finance', 'Crypto', 'Science', 'Other'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${categoryFilter === cat
                                ? 'bg-primary text-white shadow-sm'
                                : 'bg-surface hover:bg-surface/80 text-fg/60 hover:text-fg border border-border/20'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Category Grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-12 custom-scrollbar">
                {loading ? (
                    <div className="h-64 flex items-center justify-center text-fg/30">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                    </div>
                ) : (
                    <CategoryGrid
                        signals={signals}
                        onCategoryClick={(id) => setSelectedCategory(id)}
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
                onCopyText={handleCopy}
                onArchive={handleArchive}
            />
        </div>
    )
}
