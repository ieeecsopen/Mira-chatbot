import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, RefreshCw, Maximize2, Quote } from 'lucide-react';
import { useState, useCallback, memo, useMemo } from 'react';
import { CodeBlock, InlineCode } from './ui/CodeBlock';
import { UrlPreview, extractUrls } from './ui/UrlPreview';

interface MessageBubbleProps {
    role: 'user' | 'assistant';
    content: string;
    isStreaming?: boolean;
    isWaiting?: boolean;
    onRegenerate?: () => void;
    onOpenInCanvas?: (content: string, language?: string) => void;
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
            <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.6s' }} />
            <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.6s' }} />
            <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.6s' }} />
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

function MessageBubbleComponent({ role, content, isStreaming, isWaiting, onRegenerate, onOpenInCanvas }: MessageBubbleProps) {
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

    // Check if content has code blocks that can be opened in canvas
    const hasCodeBlocks = useMemo(() => {
        return /```(\w+)?\n[\s\S]{20,}?```/.test(content);
    }, [content]);

    // Extract first code block for canvas
    const handleOpenInCanvas = useCallback(() => {
        if (!onOpenInCanvas) return;

        const match = content.match(/```(\w+)?\n([\s\S]*?)```/);
        if (match) {
            const language = match[1] || 'plaintext';
            const code = match[2].trim();
            onOpenInCanvas(code, language);
        }
    }, [content, onOpenInCanvas]);

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
                    ? "bg-[#1a1a1a] text-white px-5 py-3 rounded-2xl"
                    : "text-gray-100 px-0 py-2"
            )}>
                {/* Removed MIRA label for cleaner look */}

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
                                <span className="inline-block w-2 h-5 ml-1 align-middle bg-white animate-pulse rounded-sm" />
                            )}
                        </>
                    )}
                </div>

                {/* Action buttons for assistant messages */}
                {role === 'assistant' && content && !isStreaming && (
                    <div className="flex items-center gap-2 mt-3 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        {hasCodeBlocks && onOpenInCanvas && (
                            <button
                                onClick={handleOpenInCanvas}
                                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
                                title="Open in Canvas"
                            >
                                <Maximize2 size={14} />
                                <span>Open in Canvas</span>
                            </button>
                        )}
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
