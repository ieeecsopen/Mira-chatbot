import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Sparkles } from 'lucide-react';

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
                "flex w-full mb-8",
                role === 'user' ? "justify-end" : "justify-start"
            )}
        >
            <div className={cn(
                "max-w-[85%] md:max-w-[75%] text-lg leading-relaxed",
                role === 'user'
                    ? "bg-gradient-to-br from-orange-600 to-red-600 text-white px-6 py-4 rounded-3xl rounded-tr-sm shadow-lg"
                    : "text-gray-100 px-0 py-2"
            )}>
                {role === 'assistant' && (
                    <div className="flex items-center gap-2 font-medium text-sm text-orange-500 mb-2">
                        <Sparkles className="w-4 h-4" />
                        MIRA
                    </div>
                )}
                <div className="whitespace-pre-wrap prose prose-invert prose-lg max-w-none">
                    <ReactMarkdown
                        components={{
                            // Bold text
                            strong: ({ children }) => (
                                <strong className="font-bold text-white">{children}</strong>
                            ),
                            // Italic text
                            em: ({ children }) => (
                                <em className="italic text-gray-300">{children}</em>
                            ),
                            // Paragraphs
                            p: ({ children }) => (
                                <p className="mb-4 last:mb-0">{children}</p>
                            ),
                            // Lists
                            ul: ({ children }) => (
                                <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>
                            ),
                            ol: ({ children }) => (
                                <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>
                            ),
                            li: ({ children }) => (
                                <li className="mb-1">{children}</li>
                            ),
                            // Code
                            code: ({ children }) => (
                                <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-orange-200">{children}</code>
                            ),
                            // Headings
                            h1: ({ children }) => (
                                <h1 className="text-2xl font-bold mb-3 text-white">{children}</h1>
                            ),
                            h2: ({ children }) => (
                                <h2 className="text-xl font-bold mb-3 text-white">{children}</h2>
                            ),
                            h3: ({ children }) => (
                                <h3 className="text-lg font-bold mb-2 text-white">{children}</h3>
                            ),
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                    {isStreaming && (
                        <span className="inline-block w-2 h-5 ml-1 align-middle bg-orange-500 animate-pulse rounded-full" />
                    )}
                </div>
            </div>
        </motion.div>
    );
}
