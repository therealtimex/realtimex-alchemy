import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { Signal } from '../../lib/types'
import { SignalCard } from './SignalCard'
import { PRIMARY_CATEGORIES } from '../../lib/categories'
import { NoteModal } from './NoteModal'
import { supabase } from '../../lib/supabase'

interface SignalDrawerProps {
    isOpen: boolean
    onClose: () => void
    categoryId: string
    signals: Signal[] // Used as fallback/cache
    onOpenUrl?: (url: string) => void
    onFavourite?: (id: string, current: boolean) => void
    onNote?: (id: string, note: string) => Promise<void>
    onBoost?: (id: string, current: boolean) => void
    onDismiss?: (id: string, current: boolean) => void
}

export function SignalDrawer({
    isOpen,
    onClose,
    categoryId,
    signals,
    onOpenUrl,
    onFavourite,
    onNote,
    onBoost,
    onDismiss
}: SignalDrawerProps) {
    const { t } = useTranslation()
    const category = PRIMARY_CATEGORIES.find(c => c.id === categoryId)
    const [noteTarget, setNoteTarget] = useState<{ id: string, note: string | null, title: string } | null>(null)
    const [drawerSignals, setDrawerSignals] = useState<Signal[]>([])
    const [loading, setLoading] = useState(false)

    // Fetch signals for this category when drawer opens
    useEffect(() => {
        if (!isOpen || !categoryId) {
            setDrawerSignals([])
            return
        }

        const fetchCategorySignals = async () => {
            setLoading(true)

            // Map category ID to the name the LLM uses
            const categoryName = category?.name || categoryId

            const { data, error } = await supabase
                .from('signals')
                .select('*')
                .ilike('category', categoryName)
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) {
                console.error('Error fetching category signals:', error)
                // Fallback to filtering from props
                setDrawerSignals(signals.filter(s => {
                    const tags = s.tags || []
                    const categoryMatch = s.category?.toLowerCase() === categoryId
                    const tagMatch = tags.some(tag => tag.toLowerCase().includes(categoryId))
                    return categoryMatch || tagMatch
                }))
            } else {
                setDrawerSignals(data || [])
            }
            setLoading(false)
        }

        fetchCategorySignals()
    }, [isOpen, categoryId, category?.name])

    const filteredSignals = drawerSignals

    const handleOpen = (url: string) => {
        if (onOpenUrl) {
            onOpenUrl(url)
        } else {
            window.open(url, '_blank', 'noopener,noreferrer')
        }
    }

    const handleNoteOpen = (id: string, note: string | null, title: string) => {
        setNoteTarget({ id, note, title })
    }

    const handleNoteSave = async (note: string) => {
        if (noteTarget && onNote) {
            await onNote(noteTarget.id, note)
            setNoteTarget(null)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-bg border-l border-border z-50 overflow-y-auto custom-scrollbar"
                    >
                        {/* Header - Sticky */}
                        <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur-md border-b border-border p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {category?.icon && (
                                        <div className="w-10 h-10 flex items-center justify-center bg-surface/50 rounded-xl border border-white/5">
                                            <category.icon size={28} className="text-primary" />
                                        </div>
                                    )}
                                    <div>
                                        <h2 className="text-2xl font-bold">{t(`common.categories.${categoryId}`, category?.name)}</h2>
                                        <p className="text-sm text-fg/50 font-mono">
                                            {filteredSignals.length === 1
                                                ? t('discovery.signal_count_one', { count: filteredSignals.length })
                                                : t('discovery.signal_count_other', { count: filteredSignals.length })}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-surface rounded-lg transition-colors text-fg/60 hover:text-fg"
                                    aria-label={t('common.close')}
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Signals List */}
                        <div className="p-6 space-y-4">
                            {loading ? (
                                <div className="h-64 flex flex-col items-center justify-center text-fg/30 gap-2">
                                    <Loader2 size={32} className="animate-spin" />
                                    <p>{t('discovery.loading_signals')}</p>
                                </div>
                            ) : filteredSignals.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-fg/30 gap-2">
                                    {category?.icon && <category.icon size={48} className="opacity-20" />}
                                    <p className="italic">{t('discovery.no_signals_in_category', { category: t(`common.categories.${categoryId}`, category?.name) })}</p>
                                </div>
                            ) : (
                                filteredSignals.map(signal => (
                                    <SignalCard
                                        key={signal.id}
                                        signal={signal}
                                        onOpen={handleOpen}
                                        onFavourite={onFavourite}
                                        onNote={handleNoteOpen}
                                        onBoost={onBoost}
                                        onDismiss={onDismiss}
                                    />
                                ))
                            )}
                        </div>
                    </motion.div>

                    {/* Note Modal Integration */}
                    {noteTarget && (
                        <NoteModal
                            isOpen={!!noteTarget}
                            onClose={() => setNoteTarget(null)}
                            title={noteTarget.title}
                            initialNote={noteTarget.note}
                            onSave={handleNoteSave}
                        />
                    )}
                </>
            )}
        </AnimatePresence>
    )
}
