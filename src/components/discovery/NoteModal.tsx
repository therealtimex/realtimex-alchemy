import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, FileText } from 'lucide-react'

interface NoteModalProps {
    isOpen: boolean
    onClose: () => void
    initialNote?: string | null
    title: string
    onSave: (note: string) => Promise<void>
}

export function NoteModal({ isOpen, onClose, initialNote, title, onSave }: NoteModalProps) {
    const [note, setNote] = useState(initialNote || '')
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        setNote(initialNote || '')
    }, [initialNote, isOpen])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await onSave(note)
            onClose()
        } catch (error) {
            console.error('Failed to save note:', error)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                    />
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-bg border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden pointer-events-auto"
                        >
                            <div className="p-4 border-b border-border flex items-center justify-between bg-surface/30">
                                <h3 className="font-bold flex items-center gap-2">
                                    <FileText size={18} className="text-primary" />
                                    Add Note
                                </h3>
                                <button onClick={onClose} className="p-1 hover:bg-surface rounded text-fg/40 hover:text-fg transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-4 space-y-3">
                                <p className="text-xs text-fg/50 line-clamp-1 font-mono">
                                    Target: {title}
                                </p>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Enter your thoughts, ideas, or action items regarding this signal..."
                                    className="w-full h-40 bg-surface/50 border border-border/20 rounded-lg p-3 text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none resize-none placeholder:text-fg/20"
                                    autoFocus
                                />
                            </div>

                            <div className="p-4 border-t border-border bg-surface/10 flex justify-end gap-2">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 hover:bg-surface rounded-lg text-xs font-bold text-fg/60 transition-colors"
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={14} />
                                            Save Note
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}
