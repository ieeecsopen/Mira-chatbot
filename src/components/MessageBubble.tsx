import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, RefreshCw, Maximize2, Quote, Pencil, X, Send, Link as LinkIcon } from 'lucide-react';
import { useState, useCallback, memo, useMemo, useRef, useEffect } from 'react';
import { CodeBlock, InlineCode } from './ui/CodeBlock';
import { UrlPreview } from './ui/UrlPreview';
import type { SearchResult } from '../lib/webSearch';

interface MessageBubbleProps {
    role: 'user' | 'assistant';
    content: string;
    messageId?: string;
    isStreaming?: boolean;
    isWaiting?: boolean;
    onRegenerate?: () => void;
    onOpenInCanvas?: (content: string, language?: string) => void;
    onEdit?: (messageId: string, newContent: string) => void;
    searchResults?: SearchResult[];
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
const createMarkdownComponents = (onOpenInCanvas?: (code: string, language?: string) => void) => ({
    // Bold text
    strong: ({ children }: { children?: React.ReactNode }) => (
        <strong className="font-bold text-white">{children}</strong>
                    </div>
                )}
                {/* Web search sources */}
                {role === 'assistant' && searchResults && searchResults.length > 0 && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {searchResults.slice(0, 6).map((result, idx) => (
                            <a
                                key={`${result.url}-${idx}`}
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#c9d1d9] hover:border-orange-400 hover:bg-[#161b22] transition-colors"
                            >
                                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-500/20 text-orange-300 text-xs font-semibold">
                                    {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="truncate font-medium text-[#e6edf3]">{result.title || result.url}</p>
                                    <p className="truncate text-xs text-[#8b949e]">{result.source || result.url}</p>
                                </div>
                                <LinkIcon size={14} className="text-[#8b949e] flex-shrink-0" />
                            </a>
                        ))}
                    </div>
                )}
    ),
    // Italic text
    em: ({ children }: { children?: React.ReactNode }) => (
        <em className="italic text-orange-300">{children}</em>
    ),
    // Paragraphs
    p: ({ children }: { children?: React.ReactNode }) => (
        <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>
    ),
    // Unordered Lists - Enhanced styling
    ul: ({ children }: { children?: React.ReactNode }) => (
        <ul className="my-4 ml-2 space-y-2 list-none">
            {children}
        </ul>
    ),
    // Ordered Lists - Enhanced styling
    ol: ({ children }: { children?: React.ReactNode }) => (
        <ol className="my-4 ml-2 space-y-2 list-none counter-reset-item">
            {children}
        </ol>
    ),
    // List items with custom bullets/numbers
    li: ({ children, ordered, index }: { children?: React.ReactNode; ordered?: boolean; index?: number }) => (
        <li className="flex gap-3 text-[#c9d1d9]">
            <span className={cn(
                "flex-shrink-0 mt-1",
                ordered
                    ? "text-orange-400 font-medium min-w-[1.5rem]"
                    : "text-[#7ee787]"
            )}>
                {ordered ? `${(index || 0) + 1}.` : '•'}
            </span>
            <span className="flex-1">{children}</span>
        </li>
    ),
    // Code blocks with syntax highlighting
    code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
        const match = /language-(\w+)/.exec(className || '');
        const isInline = !match && !className;

        if (isInline) {
            return <InlineCode>{children}</InlineCode>;
        }

        const language = match ? match[1] : 'plaintext';
        const codeString = String(children).replace(/\n$/, '');

        return (
            <CodeBlock
                language={language}
                onOpenInCanvas={onOpenInCanvas}
            >
                {codeString}
            </CodeBlock>
        );
    },
    // Pre blocks (wrapper for code)
    pre: ({ children }: { children?: React.ReactNode }) => (
        <>{children}</>
    ),
    // Headings with enhanced styling
    h1: ({ children }: { children?: React.ReactNode }) => (
        <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0 text-white border-b border-[#30363d] pb-2">{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
        <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0 text-white border-b border-[#30363d] pb-2">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
        <h3 className="text-lg font-semibold mb-2 mt-4 first:mt-0 text-white">{children}</h3>
    ),
    h4: ({ children }: { children?: React.ReactNode }) => (
        <h4 className="text-base font-semibold mb-2 mt-3 first:mt-0 text-[#c9d1d9]">{children}</h4>
    ),
    // Blockquotes with distinctive styling
    blockquote: ({ children }: { children?: React.ReactNode }) => (
        <blockquote className="my-4 pl-4 py-2 border-l-4 border-orange-500 bg-[#161b22] rounded-r-lg">
            <div className="flex gap-2">
                <Quote size={16} className="text-orange-400 flex-shrink-0 mt-1" />
                <div className="text-[#8b949e] italic">{children}</div>
            </div>
        </blockquote>
    ),
    // Tables with enhanced styling
    table: ({ children }: { children?: React.ReactNode }) => (
        <div className="my-4 overflow-x-auto rounded-lg border border-[#30363d]">
            <table className="min-w-full divide-y divide-[#30363d]">
                {children}
            </table>
        </div>
    ),
    thead: ({ children }: { children?: React.ReactNode }) => (
        <thead className="bg-[#161b22]">
            {children}
        </thead>
    ),
    tbody: ({ children }: { children?: React.ReactNode }) => (
        <tbody className="divide-y divide-[#30363d] bg-[#0d1117]">
            {children}
        </tbody>
    ),
    tr: ({ children }: { children?: React.ReactNode }) => (
        <tr className="hover:bg-[#161b22] transition-colors">
            {children}
        </tr>
    ),
    th: ({ children }: { children?: React.ReactNode }) => (
        <th className="px-4 py-3 text-left text-sm font-semibold text-[#c9d1d9] uppercase tracking-wider">
            {children}
        </th>
    ),
    td: ({ children }: { children?: React.ReactNode }) => (
        <td className="px-4 py-3 text-sm text-[#8b949e]">
            {children}
        </td>
    ),
    // Links with URL preview support
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
        // Check if this is a standalone URL that should show a preview
        const isStandaloneUrl = href && children && String(children) === href;

        if (isStandaloneUrl && href) {
            return <UrlPreview url={href} />;
        }

        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 hover:underline transition-colors"
            >
                {children}
            </a>
        );
    },
    // Horizontal rule
    hr: () => (
        <hr className="my-6 border-t border-[#30363d]" />
    ),
    // Images
    img: ({ src, alt }: { src?: string; alt?: string }) => (
        <img
            src={src}
            alt={alt || ''}
            className="my-4 max-w-full rounded-lg border border-[#30363d]"
        />
    ),
});

function MessageBubbleComponent({
    role,
    content,
    messageId,
    isStreaming,
    isWaiting,
    onRegenerate,
    onOpenInCanvas,
    onEdit,
    searchResults
}: MessageBubbleProps) {
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(content);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Focus textarea when entering edit mode
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(editContent.length, editContent.length);
        }
    }, [isEditing, editContent.length]);

    // Handle keyboard shortcuts in edit mode
    useEffect(() => {
        if (!isEditing) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleCancelEdit();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEditing]);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, [content]);

    const handleStartEdit = useCallback(() => {
        setEditContent(content);
        setIsEditing(true);
    }, [content]);

    const handleCancelEdit = useCallback(() => {
        setIsEditing(false);
        setEditContent(content);
    }, [content]);

    const handleSaveEdit = useCallback(() => {
        if (onEdit && messageId && editContent.trim() && editContent !== content) {
            onEdit(messageId, editContent.trim());
        }
        setIsEditing(false);
    }, [onEdit, messageId, editContent, content]);

    const handleTextareaKeyDown = useCallback((e: React.KeyboardEvent) => {
        // Submit on Enter (without Shift for multi-line)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveEdit();
        }
    }, [handleSaveEdit]);

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

    // Create markdown components with canvas handler
    const markdownComponents = useMemo(
        () => createMarkdownComponents(onOpenInCanvas),
        [onOpenInCanvas]
    );

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
                    ? "bg-[#161b22] text-[#c9d1d9] px-5 py-3 rounded-2xl border border-[#30363d]"
                    : "text-gray-100 px-0 py-2"
            )}>
                <div className="whitespace-pre-wrap prose prose-invert prose-lg max-w-none">
                    {showSkeleton ? (
                        <SkeletonLoader />
                    ) : showTyping ? (
                        <TypingIndicator />
                    ) : isEditing && role === 'user' ? (
                        // Edit Mode UI
                        <div className="flex flex-col gap-2">
                            <textarea
                                ref={textareaRef}
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onKeyDown={handleTextareaKeyDown}
                                className="w-full min-h-[80px] p-3 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#c9d1d9] resize-none focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                placeholder="Edit your message..."
                            />
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    onClick={handleCancelEdit}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#8b949e] hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <X size={14} />
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={!editContent.trim() || editContent === content}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send size={14} />
                                    Save & Resend
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={markdownComponents}
                            >
                                {content}
                            </ReactMarkdown>
                            {isStreaming && (
                                <span className="inline-block w-2 h-5 ml-1 align-middle bg-white animate-pulse rounded-sm" />
                            )}
                        </>
                    )}
                </div>

                {/* Action buttons for user messages - Edit */}
                {role === 'user' && content && !isStreaming && !isEditing && onEdit && messageId && (
                    <div className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={handleStartEdit}
                            className="p-2 text-[#8b949e] hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Edit message"
                        >
                            <Pencil size={16} />
                        </button>
                    </div>
                )}

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
