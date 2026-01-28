import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User as UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Message } from './ChatTab';

interface MessageBubbleProps {
    message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const { t } = useTranslation();
    const isUser = message.role === 'user';
    const markdownComponents = {
        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
        a: ({ node, ...props }) => <a className="text-primary hover:underline" {...props} />,
        ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2" {...props} />,
        blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-border/50 pl-3 text-fg/70 italic mb-2" {...props} />,
        table: ({ node, ...props }) => <table className="w-full text-xs border-collapse my-2" {...props} />,
        th: ({ node, ...props }) => <th className="border border-border/30 bg-surface/60 px-2 py-1 text-left font-semibold" {...props} />,
        td: ({ node, ...props }) => <td className="border border-border/30 px-2 py-1 align-top" {...props} />,
        code: ({ node, inline, className, ...props }) => (
            <code
                className={
                    inline
                        ? 'bg-black/20 rounded px-1 py-0.5 font-mono text-xs'
                        : 'block bg-black/30 rounded-lg p-3 font-mono text-xs leading-relaxed overflow-x-auto'
                }
                {...props}
            />
        ),
        pre: ({ node, ...props }) => <pre className="my-2" {...props} />
    };

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
                        <div className="markdown-body">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                {message.content}
                            </ReactMarkdown>
                        </div>
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
