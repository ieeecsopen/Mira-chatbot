import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

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
                <div className="whitespace-pre-wrap">
                    {content}
                    {isStreaming && (
                        <span className="inline-block w-2 h-4 ml-1 align-middle bg-current animate-pulse" />
                    )}
                </div>
            </div>
        </motion.div>
    );
}
