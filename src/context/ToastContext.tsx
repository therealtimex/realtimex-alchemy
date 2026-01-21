import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        const toast: Toast = { id, type, message };

        setToasts(prev => [...prev, toast]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <ToastContainer toasts={toasts} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
            <AnimatePresence>
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} />
                ))}
            </AnimatePresence>
        </div>
    );
}

function ToastItem({ toast }: { toast: Toast }) {
    const icons = {
        success: <Check size={18} className="text-success" />,
        error: <X size={18} className="text-error" />,
        warning: <AlertCircle size={18} className="text-accent" />,
        info: <Info size={18} className="text-primary" />,
    };

    const colors = {
        success: 'border-success/20 bg-success/10',
        error: 'border-error/20 bg-error/10',
        warning: 'border-accent/20 bg-accent/10',
        info: 'border-primary/20 bg-primary/10',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            className={`glass px-4 py-3 rounded-xl border ${colors[toast.type]} flex items-center gap-3 min-w-[300px] max-w-md pointer-events-auto shadow-lg`}
        >
            {icons[toast.type]}
            <span className="text-sm font-medium flex-1">{toast.message}</span>
        </motion.div>
    );
}
