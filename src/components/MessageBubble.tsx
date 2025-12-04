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
                "flex w-full mb-6",
                role === 'user' ? "justify-end" : "justify-start"
            )}
        >
            <div className={cn(
                "max-w-[90%] md:max-w-[80%] text-lg leading-relaxed",
                role === 'user'
                    ? "bg-[#111] text-white px-5 py-3 rounded-lg border border-white/10"
                    : "text-gray-100 px-0 py-2"
            )}>
                {role === 'assistant' && (
                    <div className="flex items-center gap-2 font-mono text-sm text-gray-500 mb-2 uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" />
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
                                <em className="italic text-gray-400">{children}</em>
                            ),
                            // Paragraphs
                            p: ({ children }) => (
                                <p className="mb-3 last:mb-0">{children}</p>
                            ),
                            // Lists
                            ul: ({ children }) => (
                                <ul className="list-disc list-inside mb-3 space-y-1 text-gray-300">{children}</ul>
                            ),
                            ol: ({ children }) => (
                                <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-300">{children}</ol>
                            ),
                            li: ({ children }) => (
                                <li className="mb-1">{children}</li>
                            ),
                            // Code
                            code: ({ children }) => (
                                <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-white border border-white/10">{children}</code>
                            ),
                            // Headings
                            h1: ({ children }) => (
                                <h1 className="text-2xl font-bold mb-3 text-white">{children}</h1>
                            ),
                            h2: ({ children }) => (
                                <h2 className="text-xl font-bold mb-2 text-white">{children}</h2>
                            ),
                            h3: ({ children }) => (
                                <h3 className="text-lg font-bold mb-2 text-white">{children}</h3>
                            ),
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                    {isStreaming && (
                        <span className="inline-block w-2 h-4 ml-1 align-middle bg-white animate-pulse" />
                    )}
                </div>
            </div>
        </motion.div>
    );
}
