import React from 'react';
import { Database, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface MigrationBannerProps {
    onOpen: () => void;
}

export function MigrationBanner({ onOpen }: MigrationBannerProps) {
    const { t } = useTranslation();

    return (
        <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-primary px-4 py-2 flex items-center justify-center gap-4 text-white text-xs font-bold cursor-pointer hover:bg-primary/90 transition-all z-[100] sticky top-0"
            onClick={onOpen}
        >
            <div className="flex items-center gap-2">
                <Database size={14} />
                <span>{t('migration.update_available', 'Database update available')}</span>
            </div>
            <div className="flex items-center gap-1 opacity-80 hover:opacity-100 uppercase tracking-tighter">
                <span>{t('migration.apply_now', 'Apply Now')}</span>
                <ArrowRight size={10} />
            </div>
        </motion.div>
    );
}
