"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import {
    Search,
    Sparkles,
    ImageIcon,
    Mic,
    User2,
} from "lucide-react";

interface RuixenMoonChatProps {
    onStartChat?: (message: string) => void;
    selectedModel?: string;
    onModelChange?: (modelId: string) => void;
}

const actionButtons = [
    { icon: Search, label: "Deep Search", color: "from-blue-500/20 to-cyan-500/20", hoverColor: "hover:from-blue-500/30 hover:to-cyan-500/30", textColor: "text-blue-400" },
    { icon: ImageIcon, label: "Create Image", color: "from-purple-500/20 to-pink-500/20", hoverColor: "hover:from-purple-500/30 hover:to-pink-500/30", textColor: "text-purple-400" },
    { icon: User2, label: "Pick Personas", color: "from-green-500/20 to-emerald-500/20", hoverColor: "hover:from-green-500/30 hover:to-emerald-500/30", textColor: "text-green-400" },
    { icon: Mic, label: "Voice", color: "from-orange-500/20 to-red-500/20", hoverColor: "hover:from-orange-500/30 hover:to-red-500/30", textColor: "text-orange-400" },
];

export default function RuixenMoonChat({ onStartChat }: RuixenMoonChatProps) {
    const [message, setMessage] = useState("");
    const [isFocused, setIsFocused] = useState(false);

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
            {/* Animated GIF Background */}
            <div
                className="absolute inset-0 opacity-30"
                style={{
                    backgroundImage: `url('https://static.independent.co.uk/2024/03/27/14/SGRA_polarimetric_press_image.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                }}
            />

            {/* Dark overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/60 via-[#0a0a0a]/70 to-[#0a0a0a]/80" />

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-2xl px-6 flex flex-col items-center">
                {/* Simple Logo */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-3 mb-16"
                >
                    <div className="w-12 h-12 rounded-xl bg-white/5 backdrop-blur-sm flex items-center justify-center border border-white/10">
                        <Sparkles size={24} className="text-white" />
                    </div>
                    <h1 className="text-5xl font-bold text-white tracking-tight">
                        Mira
                    </h1>
                </motion.div>

                {/* Search Input */}
                <motion.form
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    onSubmit={handleSubmit}
                    className="w-full mb-8"
                >
                    <div
                        className={cn(
                            "relative bg-[#1a1a1a]/60 backdrop-blur-xl rounded-full transition-all duration-300 border",
                            isFocused
                                ? "border-white/20 shadow-2xl shadow-white/5"
                                : "border-white/10 shadow-lg shadow-black/20"
                        )}
                    >
                        <div className="flex items-center gap-3 px-6 py-4">
                            <Sparkles size={18} className="text-gray-500 flex-shrink-0" />
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder="What do you want to know?"
                                className="flex-1 bg-transparent border-none focus:outline-none text-base text-white placeholder-gray-500 font-normal"
                            />
                            {/* Auto badge - always visible */}
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                                <Sparkles size={12} className="text-gray-400" />
                                <span className="text-xs text-gray-400 font-medium">Auto</span>
                            </div>
                            {/* Voice button */}
                            <button
                                type="button"
                                className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-all flex-shrink-0"
                                aria-label="Voice input"
                            >
                                <div className="w-2 h-2 rounded-full bg-black" />
                            </button>
                        </div>
                    </div>
                </motion.form>

                {/* Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex flex-wrap items-center justify-center gap-3"
                >
                    {actionButtons.map((btn, index) => (
                        <motion.button
                            key={btn.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + index * 0.05 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                                "group flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-200 border border-white/10",
                                `bg-gradient-to-r ${btn.color} ${btn.hoverColor}`
                            )}
                        >
                            <btn.icon size={16} className={cn("transition-colors", btn.textColor)} />
                            <span className="text-sm text-gray-300 group-hover:text-white font-medium transition-colors">
                                {btn.label}
                            </span>
                        </motion.button>
                    ))}
                </motion.div>

                {/* Footer Text */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
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
