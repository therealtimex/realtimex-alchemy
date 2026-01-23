import React, { useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';

interface SourceUrlsProps {
    urls: string[];
    timestamps?: string[];
}

export function SourceUrls({ urls, timestamps = [] }: SourceUrlsProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (urls.length <= 1) return null;

    return (
        <div className="mt-4 border-t border-border pt-4">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between w-full text-sm text-fg/60 hover:text-fg transition-colors"
            >
                <span className="font-medium">View all sources ({urls.length})</span>
                <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            {isExpanded && (
                <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {urls.map((url, index) => (
                        <div key={index} className="flex items-start gap-2 text-xs p-2 rounded-lg hover:bg-surface/50 transition-colors">
                            <ExternalLink size={12} className="text-primary mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-fg/70 hover:text-primary underline truncate block"
                                >
                                    {url}
                                </a>
                                {timestamps[index] && (
                                    <span className="text-fg/40 text-[10px]">
                                        {new Date(timestamps[index]).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
