"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Textarea } from "./textarea";
import { Button } from "./button";
import { cn } from "../../lib/utils";
import {
    ArrowUpIcon,
    Sparkles,
    Zap,
    Brain,
    Code2,
    ImageIcon,
    FileText,
    MessagesSquare,
} from "lucide-react";

interface AutoResizeProps {
    minHeight: number;
    maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: AutoResizeProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            if (reset) {
                textarea.style.height = `${minHeight}px`;
                return;
            }

            textarea.style.height = `${minHeight}px`; // reset first
            const newHeight = Math.max(
                minHeight,
                Math.min(textarea.scrollHeight, maxHeight ?? Infinity)
            );
            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    return { textareaRef, adjustHeight };
}

interface RuixenMoonChatProps {
    onStartChat?: (message: string) => void;
    selectedModel?: string;
    onModelChange?: (modelId: string) => void;
}

const examplePrompts = [
    { icon: Code2, text: "Write a Python function to sort a list", color: "from-blue-500 to-cyan-500" },
    { icon: ImageIcon, text: "Generate an image of a sunset", color: "from-purple-500 to-pink-500" },
    { icon: Brain, text: "Explain quantum computing simply", color: "from-green-500 to-emerald-500" },
    { icon: FileText, text: "Summarize this document", color: "from-orange-500 to-red-500" },
];

export default function RuixenMoonChat({ onStartChat }: RuixenMoonChatProps) {
    const [message, setMessage] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 24,
        maxHeight: 200,
    });

    const handleSend = () => {
        if (message.trim() && onStartChat) {
            onStartChat(message);
            setMessage("");
            adjustHeight(true);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handlePromptClick = (text: string) => {
        setMessage(text);
        if (onStartChat) {
            onStartChat(text);
        }
    };

    return (
        <div className="relative w-full h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] flex flex-col items-center justify-center overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
                <motion.div
                    className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.5, 0.3, 0.5],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-3xl px-4 flex flex-col items-center">
                {/* Logo and Title */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col items-center mb-12"
                >
                    <motion.div
                        className="relative mb-6"
                        whileHover={{ scale: 1.05 }}
                    >
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-orange-500/30">
                            <Sparkles size={36} className="text-white" />
                        </div>
                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl blur opacity-40 -z-10" />

                        {/* Orbiting elements */}
                        <motion.div
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        >
                            <Zap size={14} className="text-white m-auto mt-1" />
                        </motion.div>
                        <motion.div
                            className="absolute -bottom-2 -left-2 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg"
                            animate={{ rotate: -360 }}
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        >
                            <Brain size={14} className="text-white m-auto mt-1" />
                        </motion.div>
                    </motion.div>

                    <h1 className="text-6xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent mb-3 tracking-tight">
                        Mira
                    </h1>
                    <p className="text-lg text-gray-500 font-medium">
                        Your intelligent AI assistant
                    </p>
                </motion.div>

                {/* Input Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-full"
                >
                    <div
                        className={cn(
                            "relative bg-gradient-to-b from-[#1a1a1a] to-[#161616] rounded-2xl transition-all duration-300 border",
                            isFocused
                                ? "border-orange-500/50 shadow-2xl shadow-orange-500/20"
                                : "border-white/10 shadow-xl shadow-black/20"
                        )}
                    >
                        <div className="flex items-end gap-3 p-4">
                            <Textarea
                                ref={textareaRef}
                                value={message}
                                onChange={(e) => {
                                    setMessage(e.target.value);
                                    adjustHeight();
                                }}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder="Ask me anything..."
                                className={cn(
                                    "flex-1 px-0 py-0 resize-none border-none",
                                    "bg-transparent text-white text-base leading-relaxed",
                                    "focus-visible:ring-0 focus-visible:ring-offset-0",
                                    "placeholder:text-gray-500 min-h-[24px]"
                                )}
                                style={{ overflow: "hidden" }}
                            />

                            <Button
                                onClick={handleSend}
                                disabled={!message.trim()}
                                size="icon"
                                className={cn(
                                    "rounded-xl w-10 h-10 flex-shrink-0 transition-all duration-200",
                                    message.trim()
                                        ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/50 hover:shadow-orange-500/70 hover:scale-105"
                                        : "bg-white/5 text-gray-600 cursor-not-allowed"
                                )}
                            >
                                <ArrowUpIcon className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Character count or tips */}
                        {isFocused && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="px-4 pb-3 flex items-center gap-2 text-xs text-gray-500"
                            >
                                <MessagesSquare size={12} />
                                <span>Press Enter to send, Shift+Enter for new line</span>
                            </motion.div>
                        )}
                    </div>
                </motion.div>

                {/* Example Prompts */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="w-full mt-8"
                >
                    <p className="text-sm text-gray-500 mb-4 text-center font-medium">
                        Try asking about
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <AnimatePresence>
                            {examplePrompts.map((prompt, index) => (
                                <motion.button
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 + index * 0.1 }}
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handlePromptClick(prompt.text)}
                                    className="group relative flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 text-left overflow-hidden"
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-lg",
                                        prompt.color
                                    )}>
                                        <prompt.icon size={18} className="text-white" />
                                    </div>
                                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors flex-1">
                                        {prompt.text}
                                    </span>
                                    <ArrowUpIcon size={14} className="text-gray-600 group-hover:text-orange-500 transition-colors opacity-0 group-hover:opacity-100" />

                                    {/* Hover effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] duration-700" />
                                </motion.button>
                            ))}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-12 text-xs text-gray-600 text-center"
                >
                    Mira can make mistakes. Consider checking important information.
                </motion.div>
            </div>
        </div>
    );
}
