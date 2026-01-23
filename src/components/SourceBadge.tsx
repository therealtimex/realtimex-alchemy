import React from 'react';

interface SourceBadgeProps {
    count: number;
}

export function SourceBadge({ count }: SourceBadgeProps) {
    if (count <= 1) return null;

    return (
        <div
            className="absolute top-3 right-3 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-lg flex items-center gap-1.5 z-10"
            title={`Found in ${count} different sources`}
        >
            <span className="text-lg">🔥</span>
            <span className="text-white font-bold text-sm">
                {count} {count === 1 ? 'source' : 'sources'}
            </span>
        </div>
    );
}
