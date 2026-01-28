import React from 'react';
import { useTranslation } from 'react-i18next';

interface SourceBadgeProps {
    count: number;
}

export function SourceBadge({ count }: SourceBadgeProps) {
    const { t } = useTranslation();
    if (count <= 1) return null;

    return (
        <div
            className="absolute top-3 right-3 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-lg flex items-center gap-1.5 z-10"
            title={t('discovery.source_found_in', { count })}
        >
            <span className="text-lg">🔥</span>
            <span className="text-white font-bold text-sm">
                {count === 1 ? t('discovery.source_count_one', { count }) : t('discovery.source_count_other', { count })}
            </span>
        </div>
    );
}
