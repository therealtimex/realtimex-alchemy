import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User as UserIcon, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Message } from './ChatTab';
import { useTTS } from '../../hooks/useTTS';

interface MessageBubbleProps {
    message: Message;
    isLastMessage?: boolean;
    autoSpeak?: boolean;
}

export function MessageBubble({ message, isLastMessage, autoSpeak }: MessageBubbleProps) {
    const { t } = useTranslation();
    const { speakStream, stop, isPlaying, isSpeaking, speakingId } = useTTS();
    const isUser = message.role === 'user';
    const isThisMessageSpeaking = (isPlaying || isSpeaking) && speakingId === message.id;

    // Auto-speak fresh assistant messages
    React.useEffect(() => {
        if (!isUser && autoSpeak && isLastMessage) {
            const msgTime = new Date(message.created_at).getTime();
            const now = Date.now();
            const isFresh = (now - msgTime) < 5000; // Only fresh messages (within 5 seconds)

            if (isFresh) {
                speakStream(message.content, message.id).catch(err =>
                    console.error('[MessageBubble] Auto-speak failed:', err)
                );
            }
        }
    }, [message.id, message.created_at, message.content, autoSpeak, isLastMessage, isUser, speakStream]);

    const handleSpeak = async () => {
        if (isThisMessageSpeaking) {
            stop();
        } else {
            try {
                await speakStream(message.content, message.id);
            } catch (error) {
                console.error('[MessageBubble] TTS failed:', error);
            }
        }
    };

    const markdownComponents = {
        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
        a: ({ node, ...props }) => <a className="text-primary hover:underline" {...props} />,
        ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2" {...props} />,
        blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-border/50 pl-3 text-fg/70 italic mb-2" {...props} />,
        table: ({ node, ...props }) => <table className="w-full text-xs border-collapse my-2" {...props} />,
        th: ({ node, ...props }) => <th className="border border-border/20 bg-surface/50 px-2 py-1 text-left font-semibold" {...props} />,
        td: ({ node, ...props }) => <td className="border border-border/20 px-2 py-1 align-top" {...props} />,
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
                        ? 'bg-primary/15 text-fg rounded-tr-none'
                        : 'bg-surface/70 backdrop-blur-md text-fg rounded-tl-none'
                        }`}>
                        <div className="markdown-body">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    </div>

                    {/* Timestamp + TTS Button (for assistant only) */}
                    <div className="flex items-center gap-2 mt-1 px-1">
                        <span className="text-[10px] text-fg/30">
                            {new Date(message.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        {!isUser && (
                            <button
                                onClick={handleSpeak}
                                className={`p-1 rounded-md transition-all hover:bg-surface/50 ${isThisMessageSpeaking ? 'text-primary animate-pulse' : 'text-fg/40 hover:text-fg/70'
                                    }`}
                                title={isThisMessageSpeaking ? t('chat.stop_speaking') : t('chat.speak')}
                            >
                                {isThisMessageSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
