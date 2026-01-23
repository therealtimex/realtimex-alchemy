import React from 'react';

interface HighConfidenceIndicatorProps {
    sourceCount: number;
    threshold?: number;
}

export function HighConfidenceIndicator({ sourceCount, threshold = 3 }: HighConfidenceIndicatorProps) {
    if (sourceCount < threshold) return null;

    return (
        <div className="relative group">
            {/* Glow effect */}
            <div className="absolute -top-1 -right-1 w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full blur-md opacity-60 animate-pulse"></div>

            {/* Icon */}
            <div className="relative w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">🔥</span>
            </div>

            {/* Tooltip */}
            <div className="absolute top-12 right-0 bg-surface border border-border rounded-lg px-3 py-2 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                <p className="text-xs text-fg">
                    High confidence - found in {sourceCount} sources
                </p>
            </div>
        </div>
    );
}
