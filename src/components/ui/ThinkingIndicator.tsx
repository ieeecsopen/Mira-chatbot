import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Clock, Lightbulb, Search, CheckCircle2, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ThinkingIndicatorProps {
    isThinking: boolean;
    startTime?: number;
}

const thinkingStages = [
    { icon: Search, text: 'Understanding the question', color: 'text-blue-400' },
    { icon: Lightbulb, text: 'Analyzing key concepts', color: 'text-yellow-400' },
    { icon: Brain, text: 'Processing information', color: 'text-purple-400' },
    { icon: Zap, text: 'Synthesizing insights', color: 'text-orange-400' },
    { icon: CheckCircle2, text: 'Verifying reasoning', color: 'text-green-400' },
];

export function ThinkingIndicator({ isThinking, startTime }: ThinkingIndicatorProps) {
    const [elapsedTime, setElapsedTime] = useState(0);
    const [currentStage, setCurrentStage] = useState(0);

    useEffect(() => {
        if (!isThinking || !startTime) {
            setElapsedTime(0);
            setCurrentStage(0);
            return;
        }

        const interval = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        // Cycle through thinking stages every 5 seconds for deliberate pacing
        const stageInterval = setInterval(() => {
            setCurrentStage((prev) => (prev + 1) % thinkingStages.length);
        }, 5000);

        return () => {
            clearInterval(interval);
            clearInterval(stageInterval);
        };
    }, [isThinking, startTime]);

    if (!isThinking) return null;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    const CurrentIcon = thinkingStages[currentStage].icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 rounded-xl bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-indigo-500/10 border border-purple-500/30 shadow-lg"
        >
            <div className="flex items-center gap-3 px-4 py-3">
                {/* Animated icon */}
                <div className="relative">
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 0.8, 0.5],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                        className="absolute inset-0 rounded-full bg-purple-500/40 blur-lg"
                    />
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStage}
                            initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            exit={{ scale: 0.8, opacity: 0, rotate: 10 }}
                            transition={{ duration: 0.3 }}
                        >
                            <CurrentIcon size={24} className={`${thinkingStages[currentStage].color} relative z-10`} />
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Text */}
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-purple-300">
                            Deep Thinking Mode
                        </span>
                        <motion.div
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="flex gap-1"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                        </motion.div>
                    </div>
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={currentStage}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.3 }}
                            className="text-xs text-gray-400"
                        >
                            {thinkingStages[currentStage].text}
                        </motion.p>
                    </AnimatePresence>
                </div>

                {/* Timer */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/20 border border-purple-500/20">
                    <Clock size={12} className="text-purple-400" />
                    <span className="text-xs font-mono text-purple-300">{formatTime(elapsedTime)}</span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-black/20">
                <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500"
                    animate={{
                        width: ['0%', '100%'],
                    }}
                    transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                />
            </div>
        </motion.div>
    );
}

// Enhanced collapsible thinking content display with structured formatting
interface ThinkingContentProps {
    content: string;
    defaultExpanded?: boolean;
}

export function ThinkingContent({ content, defaultExpanded = false }: ThinkingContentProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [previousLength, setPreviousLength] = useState(0);
    const [isStreaming, setIsStreaming] = useState(true);

    // Auto-expand when defaultExpanded changes to true
    useEffect(() => {
        if (defaultExpanded) {
            setIsExpanded(true);
        }
    }, [defaultExpanded]);

    // Detect when content stops streaming
    useEffect(() => {
        setPreviousLength(content.length);
        setIsStreaming(true);
        
        const timer = setTimeout(() => {
            setIsStreaming(false);
        }, 500); // If no new content for 500ms, stop streaming indicator

        return () => clearTimeout(timer);
    }, [content]);

    if (!content) return null;

    // Parse and format thinking content to highlight structure
    const formatThinkingContent = (text: string) => {
        // Highlight numbered steps
        let formatted = text.replace(/(\d+\.\s+\*\*[^*]+\*\*)/g, '<div class="thinking-step">$1</div>');
        
        // Highlight section headers
        formatted = formatted.replace(/(\*\*[^*]+\*\*:)/g, '<span class="thinking-header">$1</span>');
        
        return formatted;
    };

    const wordCount = content.split(/\s+/).length;
    const estimatedReadTime = Math.ceil(wordCount / 200); // ~200 words per minute

    return (
        <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            transition={{ 
                duration: 0.8, 
                ease: "easeOut",
                opacity: { duration: 0.6 }
            }}
            className="mb-4 rounded-xl overflow-hidden border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-indigo-500/10 shadow-lg backdrop-blur-sm"
        >
            {/* Header - always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors group"
            >
                <div className="relative">
                    <motion.div
                        animate={{
                            scale: isExpanded ? [1, 1.1, 1] : 1,
                            opacity: isExpanded ? [0.5, 1, 0.5] : 0.7,
                        }}
                        transition={{
                            duration: 2,
                            repeat: isExpanded ? Infinity : 0,
                            ease: "easeInOut",
                        }}
                        className="absolute inset-0 rounded-full bg-purple-500/30 blur-md"
                    />
                    <Brain size={16} className="text-purple-400 relative z-10" />
                </div>
                <div className="flex-1">
                    <span className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                        Reasoning Process
                        {isStreaming && (
                            <motion.span
                                animate={{ opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="flex items-center gap-1"
                            >
                                <span className="w-1 h-1 rounded-full bg-purple-400"></span>
                                <span className="w-1 h-1 rounded-full bg-purple-400"></span>
                                <span className="w-1 h-1 rounded-full bg-purple-400"></span>
                            </motion.span>
                        )}
                        <span className="text-xs font-normal text-gray-500">
                            ({wordCount} words, ~{estimatedReadTime} min read)
                        </span>
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {isExpanded ? 'Click to collapse' : 'Click to see how Mira reasoned through this'}
                    </p>
                </div>
                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="text-purple-400 group-hover:text-purple-300 transition-colors"
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </motion.div>
            </button>

            {/* Content - collapsible with slower animation */}
            <motion.div
                initial={false}
                animate={{
                    height: isExpanded ? 'auto' : 0,
                    opacity: isExpanded ? 1 : 0,
                }}
                transition={{ 
                    duration: 0.6, 
                    ease: "easeInOut",
                    height: { duration: 0.5 },
                    opacity: { duration: 0.4, delay: 0.1 }
                }}
                className="overflow-hidden"
            >
                <div className="px-4 pb-4 pt-1">
                    <div className="relative">
                        {/* Gradient border effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-indigo-500/10 rounded-lg"></div>
                        
                        {/* Content */}
                        <div className="relative text-sm text-gray-300 leading-relaxed whitespace-pre-wrap bg-black/40 rounded-lg p-4 max-h-[500px] overflow-y-auto border border-purple-500/20 scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent [&_.thinking-step]:my-3 [&_.thinking-step]:pl-4 [&_.thinking-step]:border-l-2 [&_.thinking-step]:border-l-purple-500/40 [&_.thinking-header]:text-purple-200 [&_.thinking-header]:font-semibold">
                            {content}
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
