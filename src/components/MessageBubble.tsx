import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
    role: 'user' | 'assistant';
    content: string;
    isStreaming?: boolean;
}

export function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex w-full mb-6",
                role === 'user' ? "justify-end" : "justify-start"
            )}
        >
            <div className={cn(
                "max-w-[80%] md:max-w-[70%] text-base leading-7",
                role === 'user'
                    ? "bg-muted text-foreground px-5 py-3 rounded-2xl rounded-tr-sm"
                    : "text-foreground px-0 py-2"
            )}>
                {role === 'assistant' && (
                    <div className="font-semibold text-sm text-muted-foreground mb-1">MIRA</div>
                )}
                <div className="whitespace-pre-wrap prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                        components={{
                            // Bold text
                            strong: ({ children }) => (
                                <strong className="font-bold text-white">{children}</strong>
                            ),
                            // Italic text
                            em: ({ children }) => (
                                <em className="italic">{children}</em>
                            ),
                            // Paragraphs
                            p: ({ children }) => (
                                <p className="mb-2 last:mb-0">{children}</p>
                            ),
                            // Lists
                            ul: ({ children }) => (
                                <ul className="list-disc list-inside mb-2">{children}</ul>
                            ),
                            ol: ({ children }) => (
                                <ol className="list-decimal list-inside mb-2">{children}</ol>
                            ),
                            li: ({ children }) => (
                                <li className="mb-1">{children}</li>
                            ),
                            // Code
                            code: ({ children }) => (
                                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                            ),
                            // Headings
                            h1: ({ children }) => (
                                <h1 className="text-xl font-bold mb-2">{children}</h1>
                            ),
                            h2: ({ children }) => (
                                <h2 className="text-lg font-bold mb-2">{children}</h2>
                            ),
                            h3: ({ children }) => (
                                <h3 className="text-base font-bold mb-1">{children}</h3>
                            ),
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                    {isStreaming && (
                        <span className="inline-block w-2 h-4 ml-1 align-middle bg-current animate-pulse" />
                    )}
                </div>
            </div>
        </motion.div>
    );
}
