import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User as UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Message } from './ChatTab';

interface MessageBubbleProps {
    message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const { t } = useTranslation();
    const isUser = message.role === 'user';

    return (
        <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-primary text-white' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg glow-primary'
                    }`}>
                    {isUser ? <UserIcon size={16} /> : <Bot size={16} />}
                </div>

                {/* Bubble */}
                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isUser
                        ? 'bg-primary/10 text-fg border border-primary/20 rounded-tr-none'
                        : 'bg-surface/80 backdrop-blur-md text-fg border border-border/40 rounded-tl-none'
                        }`}>
                        {isUser ? (
                            <p className="whitespace-pre-wrap">{message.content}</p>
                        ) : (
                            <div className="markdown-body">
                                <ReactMarkdown
                                    components={{
                                        // Custom styling for citations if we parsed them
                                        // For now simpler markdown
                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                        a: ({ node, ...props }) => <a className="text-primary hover:underline" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                                        code: ({ node, ...props }) => <code className="bg-black/20 rounded px-1 py-0.5 font-mono text-xs" {...props} />
                                    }}
                                >
                                    {message.content}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>

                    {/* Timestamp */}
                    <span className="text-[10px] text-fg/30 mt-1 px-1">
                        {new Date(message.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>
        </div>
    );
}
