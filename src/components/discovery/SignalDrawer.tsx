import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Signal } from '../../lib/types'
import { SignalCard } from './SignalCard'
import { PRIMARY_CATEGORIES } from '../../lib/categories'

interface SignalDrawerProps {
    isOpen: boolean
    onClose: () => void
    categoryId: string
    signals: Signal[]
    onOpenUrl?: (url: string) => void
    onCopyText?: (text: string) => void
    onArchive?: (id: string) => void
}

export function SignalDrawer({
    isOpen,
    onClose,
    categoryId,
    signals,
    onOpenUrl,
    onCopyText,
    onArchive
}: SignalDrawerProps) {
    const category = PRIMARY_CATEGORIES.find(c => c.id === categoryId)

    // Filter signals that belong to this category
    const filteredSignals = signals.filter(s => {
        const tags = s.tags || []
        const categoryMatch = s.category?.toLowerCase() === categoryId
        const tagMatch = tags.some(tag => tag.toLowerCase().includes(categoryId))
        return categoryMatch || tagMatch
    })

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
        if (onArchive) {
            await onArchive(id)
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
                        className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-bg border-l border-white/10 z-50 overflow-y-auto custom-scrollbar"
                    >
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6 sticky top-0 bg-bg pb-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    {category?.icon && (
                                        <div className="w-10 h-10 flex items-center justify-center">
                                            <category.icon size={40} className="text-current opacity-80" />
                                        </div>
                                    )}
                                    <div>
                                        <h2 className="text-2xl font-bold">{category?.name}</h2>
                                        <p className="text-sm text-fg/50">{filteredSignals.length} {filteredSignals.length === 1 ? 'signal' : 'signals'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/10 rounded transition-colors"
                                    aria-label="Close drawer"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Signals List */}
                            <div className="space-y-4">
                                {filteredSignals.length === 0 ? (
                                    <div className="h-64 flex items-center justify-center text-fg/30">
                                        <p className="italic">No signals in this category yet.</p>
                                    </div>
                                ) : (
                                    filteredSignals.map(signal => (
                                        <SignalCard
                                            key={signal.id}
                                            signal={signal}
                                            onOpen={handleOpen}
                                            onCopy={handleCopy}
                                            onArchive={handleArchive}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
