"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import {
    Globe,
    Sparkles,
    Paperclip,
    Mic,
    ChevronDown,
    SendHorizontal,
    Brain,
    Lock,
} from "lucide-react";
import { MIRA_MODELS } from "../ModelSelector";

interface RuixenMoonChatProps {
    onStartChat?: (message: string) => void;
    selectedModel?: string;
    onModelChange?: (modelId: string) => void;
}

export default function RuixenMoonChat({ onStartChat, selectedModel = 'gemini-2.0-flash', onModelChange }: RuixenMoonChatProps) {
    const [message, setMessage] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [showModelMenu, setShowModelMenu] = useState(false);
    const [webSearchEnabled, setWebSearchEnabled] = useState(false);
    const [deepThinkEnabled, setDeepThinkEnabled] = useState(false);
    const modelMenuRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { isPremium } = useAuth();

    const currentModel = MIRA_MODELS.find(m => m.id === selectedModel) || MIRA_MODELS[0];

    // Close model menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
                setShowModelMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-resize textarea
    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [message]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && onStartChat) {
            onStartChat(message);
            setMessage("");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className="relative w-full h-screen bg-[#0a0a0a] flex flex-col items-center justify-center overflow-hidden">
            {/* Animated Background */}
            <div
                className="absolute inset-0 opacity-30"
                style={{
                    backgroundImage: `url('https://static.independent.co.uk/2024/03/27/14/SGRA_polarimetric_press_image.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                }}
            />

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/60 via-[#0a0a0a]/70 to-[#0a0a0a]/80" />

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-2xl px-6 flex flex-col items-center">
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center justify-center mb-16"
                >
                    <img
                        src="/MIRA.svg"
                        alt="Mira"
                        className="h-16"
                    />
                </motion.div>

                {/* Unified Input - Similar to ChatInput */}
                <motion.form
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    onSubmit={handleSubmit}
                    className="w-full mb-6"
                >
                    <div
                        className={cn(
                            "relative bg-[#161b22]/90 backdrop-blur-xl rounded-2xl transition-all duration-300 border",
                            isFocused
                                ? "border-white/20 shadow-2xl shadow-white/5 ring-1 ring-white/10"
                                : "border-[#30363d]/80 shadow-lg shadow-black/20"
                        )}
                    >
                        <div className="flex items-end gap-1 p-3">
                            {/* Left actions */}
                            <div className="flex items-center gap-1 pb-1">
                                {/* Model selector */}
                                <div className="relative" ref={modelMenuRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowModelMenu(!showModelMenu)}
                                        className={cn(
                                            "flex items-center gap-1.5 h-8 px-2 rounded-lg text-xs font-medium transition-all",
                                            showModelMenu
                                                ? "bg-white/10 text-white"
                                                : "text-gray-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <Sparkles size={14} className="text-orange-400" />
                                        <span className="hidden sm:inline">{currentModel.displayName}</span>
                                        <ChevronDown size={12} className={cn(
                                            "transition-transform",
                                            showModelMenu && "rotate-180"
                                        )} />
                                    </button>

                                    <AnimatePresence>
                                        {showModelMenu && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 8 }}
                                                className="absolute bottom-full left-0 mb-2 w-56 rounded-lg overflow-hidden
                                                    bg-[#1a1a1a] border border-white/10 shadow-xl z-50"
                                            >
                                                {MIRA_MODELS.map(model => {
                                                    const isLocked = !isPremium && model.id !== 'auto';

                                                    return (
                                                        <button
                                                            type="button"
                                                            key={model.id}
                                                            disabled={isLocked}
                                                            onClick={() => {
                                                                if (!isLocked) {
                                                                    onModelChange?.(model.id);
                                                                    setShowModelMenu(false);
                                                                }
                                                            }}
                                                            className={cn(
                                                                "w-full flex flex-col items-start px-3 py-2.5 text-left transition-all",
                                                                isLocked
                                                                    ? "opacity-50 cursor-not-allowed bg-black/20"
                                                                    : "hover:bg-white/5",
                                                                selectedModel === model.id
                                                                    ? "bg-orange-500/10 text-orange-400"
                                                                    : "text-gray-400 hover:text-white"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2 w-full justify-between">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-xs font-medium">{model.displayName}</span>
                                                                    {isLocked && <Lock size={10} className="text-gray-500" />}
                                                                </div>
                                                                {isLocked && <span className="text-[9px] text-orange-400 uppercase tracking-wider font-semibold">Pro</span>}
                                                            </div>
                                                            <span className="text-[10px] text-gray-500">{model.description}</span>
                                                        </button>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* File upload */}
                                <button
                                    type="button"
                                    className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                                    title="Attach file"
                                >
                                    <Paperclip size={16} />
                                </button>

                                {/* Voice input */}
                                <button
                                    type="button"
                                    className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                                    title="Voice input"
                                >
                                    <Mic size={16} />
                                </button>

                                {/* Web search toggle */}
                                <button
                                    type="button"
                                    onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                                    className={cn(
                                        "flex items-center justify-center w-8 h-8 rounded-lg transition-all",
                                        webSearchEnabled
                                            ? "bg-orange-500/20 text-orange-400"
                                            : "text-gray-500 hover:text-white hover:bg-white/5"
                                    )}
                                    title={webSearchEnabled ? "Web search on" : "Web search off"}
                                >
                                    <Globe size={16} />
                                </button>

                                {/* DeepThink toggle */}
                                <button
                                    type="button"
                                    onClick={() => setDeepThinkEnabled(!deepThinkEnabled)}
                                    className={cn(
                                        "flex items-center justify-center w-8 h-8 rounded-lg transition-all",
                                        deepThinkEnabled
                                            ? "bg-purple-500/20 text-purple-400"
                                            : "text-gray-500 hover:text-white hover:bg-white/5"
                                    )}
                                    title={deepThinkEnabled ? "Deep thinking on" : "Deep thinking off"}
                                >
                                    <Brain size={16} />
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="w-px h-6 bg-white/10 mx-1 mb-1" />

                            {/* Textarea */}
                            <textarea
                                ref={textareaRef}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder="What do you want to know?"
                                rows={1}
                                className="flex-1 max-h-[120px] py-2 px-2 bg-transparent border-none resize-none focus:outline-none text-[15px] text-white placeholder-gray-500 leading-relaxed"
                            />

                            {/* Send button */}
                            <div className="pb-1">
                                <button
                                    type="submit"
                                    disabled={!message.trim()}
                                    className={cn(
                                        "flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200",
                                        message.trim()
                                            ? "bg-white text-black hover:bg-gray-200"
                                            : "text-gray-500 bg-white/5"
                                    )}
                                >
                                    <SendHorizontal size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.form>

                {/* Minimal hint */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center"
                >
                    <span className="text-[10px] text-gray-600">
                        Type <kbd className="px-1 py-0.5 rounded bg-white/5 text-gray-500 font-mono text-[9px]">/</kbd> for commands
                    </span>
                </motion.div>

                {/* Footer Text */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-12 text-xs text-gray-600 text-center"
                >
                    By messaging Mira, you agree to our{" "}
                    <button className="text-gray-500 hover:text-gray-400 underline transition-colors">
                        Terms
                    </button>
                    {" "}and{" "}
                    <button className="text-gray-500 hover:text-gray-400 underline transition-colors">
                        Privacy Policy
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
