import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Copy, Check, RefreshCw } from 'lucide-react';
import { useState, useCallback, memo } from 'react';

interface MessageBubbleProps {
    role: 'user' | 'assistant';
    content: string;
    isStreaming?: boolean;
    isWaiting?: boolean;
    onRegenerate?: () => void;
}

// Skeleton loading component
function SkeletonLoader() {
    return (
        <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-white/10 rounded w-3/4"></div>
            <div className="h-4 bg-white/10 rounded w-1/2"></div>
            <div className="h-4 bg-white/10 rounded w-5/6"></div>
        </div>
    );
}

// Typing indicator component
function TypingIndicator() {
    return (
        <div className="flex items-center gap-1.5 py-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.6s' }} />
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.6s' }} />
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.6s' }} />
        </div>
    );
}

// Memoized markdown components for better performance
const markdownComponents = {
    // Bold text
    strong: ({ children }: { children?: React.ReactNode }) => (
        <strong className="font-bold text-white">{children}</strong>
    ),
    // Italic text
    em: ({ children }: { children?: React.ReactNode }) => (
        <em className="italic text-gray-400">{children}</em>
    ),
    // Paragraphs
    p: ({ children }: { children?: React.ReactNode }) => (
        <p className="mb-3 last:mb-0">{children}</p>
    ),
    // Lists
    ul: ({ children }: { children?: React.ReactNode }) => (
        <ul className="list-disc list-inside mb-3 space-y-1 text-gray-300">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
        <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-300">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
        <li className="mb-1">{children}</li>
    ),
    // Code
    code: ({ children }: { children?: React.ReactNode }) => (
        <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-white border border-white/10">{children}</code>
    ),
    // Headings
    h1: ({ children }: { children?: React.ReactNode }) => (
        <h1 className="text-2xl font-bold mb-3 text-white">{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
        <h2 className="text-xl font-bold mb-2 text-white">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
        <h3 className="text-lg font-bold mb-2 text-white">{children}</h3>
    ),
};

function MessageBubbleComponent({ role, content, isStreaming, isWaiting, onRegenerate }: MessageBubbleProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, [content]);

    const showSkeleton = isWaiting && !content;
    const showTyping = isStreaming && !content;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
                "flex w-full mb-6 group",
                role === 'user' ? "justify-end" : "justify-start"
            )}
        >
            <div className={cn(
                "max-w-[90%] md:max-w-[80%] text-lg leading-relaxed relative",
                role === 'user'
                    ? "bg-[#111] text-white px-5 py-3 rounded-lg border border-white/10"
                    : "text-gray-100 px-0 py-2"
            )}>
                {role === 'assistant' && (
                    <div className="flex items-center gap-2 font-mono text-sm text-gray-500 mb-2 uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" />
                        MIRA
                        {isStreaming && (
                            <span className="text-orange-500 text-xs normal-case tracking-normal ml-2">
                                generating...
                            </span>
                        )}
                    </div>
                )}
                
                <div className="whitespace-pre-wrap prose prose-invert prose-lg max-w-none">
                    {showSkeleton ? (
                        <SkeletonLoader />
                    ) : showTyping ? (
                        <TypingIndicator />
                    ) : (
                        <>
                            <ReactMarkdown components={markdownComponents}>
                                {content}
                            </ReactMarkdown>
                            {isStreaming && (
                                <span className="inline-block w-2 h-5 ml-1 align-middle bg-orange-500 animate-pulse rounded-sm" />
                            )}
                        </>
                    )}
                </div>

                {/* Action buttons for assistant messages */}
                {role === 'assistant' && content && !isStreaming && (
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
                            title="Copy to clipboard"
                        >
                            {copied ? (
                                <>
                                    <Check size={14} className="text-green-500" />
                                    <span className="text-green-500">Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy size={14} />
                                    <span>Copy</span>
                                </>
                            )}
                        </button>
                        {onRegenerate && (
                            <button
                                onClick={onRegenerate}
                                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
                                title="Regenerate response"
                            >
                                <RefreshCw size={14} />
                                <span>Regenerate</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// Memoize the component to prevent unnecessary re-renders
export const MessageBubble = memo(MessageBubbleComponent);
