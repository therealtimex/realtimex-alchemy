import React, { useState, useEffect, useCallback } from 'react';
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
    const [refreshSidebarTrigger, setRefreshSidebarTrigger] = useState(0);

    const handleSessionCreated = useCallback((id: string) => {
        setActiveSessionId(id);
        setRefreshSidebarTrigger(prev => prev + 1);
    }, []);

    const handleContextUpdate = useCallback((sources: any[]) => {
        setContextSources(sources);
        if (sources.length > 0) setIsContextVisible(true);
    }, []);

    const handleNewSession = useCallback(() => {
        setActiveSessionId(null);
        setContextSources([]);
    }, []);

    // Initial load: Get most recent session or create one?
    // Let ChatSidebar handle session fetching, but we need to know if one is selected.

    return (
        <div className="flex h-full gap-4 overflow-hidden">
            {/* Left: Sessions */}
            <ChatSidebar
                activeSessionId={activeSessionId}
                onSelectSession={setActiveSessionId}
                refreshTrigger={refreshSidebarTrigger}
            />

            {/* Middle: Chat */}
            <div className="flex-1 flex flex-col min-w-0 bg-surface/60 rounded-xl overflow-hidden border border-border relative">
                <ChatInterface
                    sessionId={activeSessionId}
                    onContextUpdate={handleContextUpdate}
                    onNewSession={handleNewSession}
                    onSessionCreated={handleSessionCreated}
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
