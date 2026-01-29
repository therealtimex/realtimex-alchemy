import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, MessageSquare, Trash2, Search } from 'lucide-react';
import axios from 'axios';
import { Session } from './ChatTab';
import { supabase } from '../../lib/supabase';

interface ChatSidebarProps {
    activeSessionId: string | null;
    onSelectSession: (id: string | null) => void;
}

export function ChatSidebar({ activeSessionId, onSelectSession }: ChatSidebarProps) {
    const { t } = useTranslation();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            if (!authSession) return;

            const res = await axios.get('/api/chat/sessions', {
                headers: { 'x-user-id': authSession.user.id }
            });
            if (res.data.success) {
                setSessions(res.data.sessions);
            }
        } catch (e) {
            console.error('Failed to fetch sessions', e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            const { error } = await supabase.from('chat_sessions').delete().eq('id', id);
            if (!error) {
                setSessions(prev => prev.filter(s => s.id !== id));
                if (activeSessionId === id) onSelectSession(null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="w-64 bg-surface/25 backdrop-blur-xl flex flex-col rounded-xl border border-border overflow-hidden">
            {/* Header / New Chat */}
            <div className="p-3 border-b border-border/40 bg-surface/15">
                <button
                    onClick={() => onSelectSession(null)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-all font-semibold text-sm border border-primary/20"
                >
                    <Plus size={16} />
                    {t('chat.new_chat')}
                </button>
            </div>

            {/* Session List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loading ? (
                    <div className="p-4 text-center text-xs text-fg/40">{t('common.loading')}</div>
                ) : sessions.length === 0 ? (
                    <div className="p-8 text-center">
                        <MessageSquare size={24} className="mx-auto text-fg/20 mb-2" />
                        <p className="text-xs text-fg/40">{t('chat.no_history')}</p>
                    </div>
                ) : (
                    sessions.map(session => (
                        <div
                            key={session.id}
                            onClick={() => onSelectSession(session.id)}
                            className={`group flex items-center justify-between px-3 py-3 rounded-lg cursor-pointer transition-all text-sm ${activeSessionId === session.id
                                ? 'bg-surface/60 text-fg ring-1 ring-primary/20'
                                : 'text-fg/60 hover:bg-surface/35 hover:text-fg'
                                }`}
                        >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                                <MessageSquare size={14} className={activeSessionId === session.id ? 'text-primary' : 'opacity-50'} />
                                <span className="truncate">{session.title}</span>
                            </div>

                            {/* Delete Action (visible on hover) */}
                            <button
                                onClick={(e) => handleDelete(e, session.id)}
                                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded transition-all focus-visible:ring-2 focus-visible:ring-red-500/40"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
