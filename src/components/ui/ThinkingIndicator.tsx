import { motion } from 'framer-motion';
import { Brain, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ThinkingIndicatorProps {
    isThinking: boolean;
    startTime?: number;
}

export function ThinkingIndicator({ isThinking, startTime }: ThinkingIndicatorProps) {
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        if (!isThinking || !startTime) {
            setElapsedTime(0);
            return;
        }

        const interval = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [isThinking, startTime]);

    if (!isThinking) return null;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20"
        >
            {/* Animated brain icon */}
            <div className="relative">
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.7, 1, 0.7],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute inset-0 rounded-full bg-purple-500/30 blur-md"
                />
                <motion.div
                    animate={{
                        rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                >
                    <Brain size={24} className="text-purple-400 relative z-10" />
                </motion.div>
            </div>

            {/* Text */}
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-purple-300">
                        Mira is thinking deeply
                    </span>
                    <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-purple-400"
                    >
                        ...
                    </motion.span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                    Analyzing and reasoning through your question
                </p>
            </div>

            {/* Timer */}
            {elapsedTime > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock size={12} />
                    <span>{formatTime(elapsedTime)}</span>
                </div>
            )}
        </motion.div>
    );
}

// Collapsible thinking content display
interface ThinkingContentProps {
    content: string;
    defaultExpanded?: boolean;
}

export function ThinkingContent({ content, defaultExpanded = false }: ThinkingContentProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    if (!content) return null;

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-3 rounded-xl overflow-hidden border border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-blue-500/5"
        >
            {/* Header - always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
            >
                <Brain size={14} className="text-purple-400" />
                <span className="text-xs font-medium text-purple-300">
                    Reasoning Process
                </span>
                <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-auto text-gray-500"
                >
                    ▼
                </motion.span>
            </button>

            {/* Content - collapsible */}
            <motion.div
                initial={false}
                animate={{
                    height: isExpanded ? 'auto' : 0,
                    opacity: isExpanded ? 1 : 0,
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
            >
                <div className="px-3 pb-3 pt-1">
                    <div className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap font-mono bg-black/20 rounded-lg p-3 max-h-[300px] overflow-y-auto">
                        {content}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
