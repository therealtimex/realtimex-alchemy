import React, { useState, useEffect } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { ChatInterface } from './ChatInterface';
import { ContextSidebar } from './ContextSidebar';
import { supabase } from '../../lib/supabase';

// Shared types
export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    context_sources?: any[];
    created_at: string;
}

export interface Session {
    id: string;
    title: string;
    updated_at: string;
}

export function ChatTab() {
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [contextSources, setContextSources] = useState<any[]>([]); // Current context to show in right sidebar
    const [isContextVisible, setIsContextVisible] = useState(true);

    // Initial load: Get most recent session or create one?
    // Let ChatSidebar handle session fetching, but we need to know if one is selected.

    return (
        <div className="flex h-full gap-4 overflow-hidden">
            {/* Left: Sessions */}
            <ChatSidebar
                activeSessionId={activeSessionId}
                onSelectSession={setActiveSessionId}
            />

            {/* Middle: Chat */}
            <div className="flex-1 flex flex-col min-w-0 bg-surface/60 rounded-2xl overflow-hidden border border-border/15 shadow-[0_12px_30px_rgba(0,0,0,0.22)] relative">
                <ChatInterface
                    sessionId={activeSessionId}
                    onContextUpdate={(sources) => {
                        setContextSources(sources);
                        if (sources.length > 0) setIsContextVisible(true);
                    }}
                    onNewSession={() => setActiveSessionId(null)} // Trigger new session creation
                    onSessionCreated={(id) => setActiveSessionId(id)}
                />
            </div>

            {/* Right: Context (RAG Sources) */}
            {isContextVisible && (
                <ContextSidebar
                    sources={contextSources}
                    onClose={() => setIsContextVisible(false)}
                />
            )}
        </div>
    );
}
