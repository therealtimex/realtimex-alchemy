import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, StopCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Message } from './ChatTab';
import { MessageBubble } from './MessageBubble';
import { supabase } from '../../lib/supabase';

interface ChatInterfaceProps {
    sessionId: string | null;
    onContextUpdate: (sources: any[]) => void;
    onNewSession: () => void;
    onSessionCreated: (id: string) => void;
}

export function ChatInterface({ sessionId, onContextUpdate, onNewSession, onSessionCreated }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isThinking, setIsThinking] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load messages when session changes
    useEffect(() => {
        if (sessionId) {
            fetchMessages(sessionId);
        } else {
            setMessages([]);
            onContextUpdate([]);
        }
    }, [sessionId, onContextUpdate]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isThinking]);

    const fetchMessages = async (sid: string) => {
        try {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            if (!authSession) return;

            const res = await axios.get(`/api/chat/sessions/${sid}/messages`, {
                headers: { 'x-user-id': authSession.user.id }
            });
            if (res.data.success) {
                setMessages(res.data.messages);
                // Update context from last message if assistant
                const lastMsg = res.data.messages[res.data.messages.length - 1];
                if (lastMsg && lastMsg.role === 'assistant' && lastMsg.context_sources) {
                    onContextUpdate(lastMsg.context_sources);
                }
            }
        } catch (e) {
            console.error('Failed to fetch messages', e);
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userContent = input.trim();
        setInput('');

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession) return;
        const userId = authSession.user.id; // Corrected: session.user.id

        setIsLoading(true);
        setIsThinking(true); // Show thinking state

        try {
            let currentSessionId = sessionId;

            // Create session if new
            if (!currentSessionId) {
                const res = await axios.post('/api/chat/sessions', {}, {
                    headers: { 'x-user-id': userId }
                });
                if (res.data.success) {
                    currentSessionId = res.data.session.id;
                    onSessionCreated(currentSessionId!);
                } else {
                    throw new Error('Failed to create session');
                }
            }

            // Optimistic User Message
            const tempUserMsg: Message = {
                id: 'temp-' + Date.now(),
                role: 'user',
                content: userContent,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, tempUserMsg]);

            // Send to Backend
            const res = await axios.post('/api/chat/message', {
                sessionId: currentSessionId,
                content: userContent
            }, {
                headers: { 'x-user-id': userId }
            });

            if (res.data.success) {
                const aiMsg = res.data.message;
                // Replace temp user msg with real one (fetch reload or just append AI)
                // For simplicity, we just append AI message and keep optimistic user msg (or fetch all)
                // Actually better to re-fetch to get exact IDs and timestamps, but for snappy feel:
                setMessages(prev => [...prev, aiMsg]);

                if (aiMsg.context_sources) {
                    onContextUpdate(aiMsg.context_sources);
                }
            }

        } catch (error) {
            console.error('Message failed', error);
            // Show error message
            setMessages(prev => [...prev, {
                id: 'err-' + Date.now(),
                role: 'assistant',
                content: 'Sorry, I encountered an error processing your request.',
                created_at: new Date().toISOString()
            }]);
        } finally {
            setIsLoading(false);
            setIsThinking(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-60">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 text-primary animate-pulse">
                            <Sparkles size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Ask Alchemist</h3>
                        <p className="text-sm max-w-md mx-auto mb-8">
                            I can help you recall information, summarize topics, and find insights from your browsing history.
                        </p>

                        {/* Suggestion Chips */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg w-full">
                            {[
                                "What have I read about React recently?",
                                "Summarize the latest AI news I visited.",
                                "Do I have any notes on Finance?",
                                "Find articles about 'Performance'"
                            ].map((suggestion, i) => (
                                <button
                                    key={i}
                                    onClick={() => setInput(suggestion)}
                                    className="text-left p-3 text-xs bg-surface/50 hover:bg-surface border border-border/30 rounded-xl transition-all hover:scale-[1.02]"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, i) => (
                            <MessageBubble key={msg.id || i} message={msg} />
                        ))}

                        {/* Thinking Indicator */}
                        {isThinking && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex justify-start w-full"
                            >
                                <div className="bg-surface/50 border border-border/30 rounded-2xl px-4 py-3 flex items-center gap-3">
                                    <div className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                                        <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                                        <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                    </div>
                                    <span className="text-xs text-fg/50 font-mono">Exploring memory...</span>
                                </div>
                            </motion.div>
                        )}
                    </>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-surface/30 border-t border-border/10 backdrop-blur-md">
                <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about your history..."
                        rows={1}
                        className="w-full bg-surface/80 border border-border/40 text-fg rounded-2xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none min-h-[46px] max-h-[200px] shadow-sm"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 bottom-2 p-2 bg-primary text-white rounded-xl shadow-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>

                    <div className="absolute -top-6 right-0 text-[10px] text-fg/30 flex items-center gap-1">
                        Use <kbd className="font-mono bg-surface border border-border/30 px-1 rounded">Shift + Enter</kbd> for new line
                    </div>
                </form>
            </div>
        </>
    );
}
