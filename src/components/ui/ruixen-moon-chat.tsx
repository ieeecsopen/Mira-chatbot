"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "./textarea";
import { Button } from "./button";
import { cn } from "../../lib/utils";
import {
    ImageIcon,
    FileUp,
    ArrowUpIcon,
    Paperclip,
    Code2,
    Palette,
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

    useEffect(() => {
        if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
    }, [minHeight]);

    return { textareaRef, adjustHeight };
}

interface RuixenMoonChatProps {
    onStartChat?: (message: string) => void;
    selectedModel?: string;
    onModelChange?: (modelId: string) => void;
}

export default function RuixenMoonChat({ onStartChat, selectedModel: _selectedModel, onModelChange: _onModelChange }: RuixenMoonChatProps) {
    const [message, setMessage] = useState("");
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 60,
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

    return (
        <div className="relative w-full h-screen bg-background flex flex-col items-center justify-center">
            {/* Centered Title */}
            <div className="flex flex-col items-center justify-center mb-12">
                <h1 className="text-4xl font-bold text-white tracking-tight mb-4">
                    Mira
                </h1>
                <p className="text-lg text-gray-500 font-medium">
                    grok with it
                </p>
            </div>

            {/* Input Box Section */}
            <div className="w-full max-w-2xl px-4 relative z-10">
                <div className="relative bg-[#1a1a1a] rounded-2xl transition-all group focus-within:ring-1 focus-within:ring-white/10">
                    <Textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => {
                            setMessage(e.target.value);
                            adjustHeight();
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything..."
                        className={cn(
                            "w-full px-4 py-4 resize-none border-none",
                            "bg-transparent text-white text-lg leading-relaxed",
                            "focus-visible:ring-0 focus-visible:ring-offset-0",
                            "placeholder:text-gray-500 min-h-[60px]"
                        )}
                        style={{ overflow: "hidden" }}
                    />

                    {/* Footer Buttons */}
                    <div className="flex items-center justify-between p-2 pl-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-500 hover:text-white hover:bg-white/10 w-8 h-8 rounded-full"
                        >
                            <Paperclip className="w-5 h-5" />
                        </Button>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleSend}
                                disabled={!message.trim()}
                                size="icon"
                                className={cn(
                                    "rounded-full w-8 h-8 transition-all duration-200 glow-hover",
                                    message.trim()
                                        ? "bg-white text-black hover:bg-gray-200"
                                        : "bg-white/5 text-gray-600 cursor-not-allowed"
                                )}
                            >
                                <ArrowUpIcon className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Quick Actions - Simplified */}
                <div className="flex items-center justify-center flex-wrap gap-2 mt-8">
                    <QuickAction icon={<Code2 className="w-4 h-4" />} label="Code" />
                    <QuickAction icon={<ImageIcon className="w-4 h-4" />} label="Images" />
                    <QuickAction icon={<FileUp className="w-4 h-4" />} label="Analyze" />
                    <QuickAction icon={<Palette className="w-4 h-4" />} label="Design" />
                </div>
            </div>
        </div>
    );
}

interface QuickActionProps {
    icon: React.ReactNode;
    label: string;
}

function QuickAction({ icon, label }: QuickActionProps) {
    return (
        <Button
            variant="ghost"
            className="flex items-center gap-2 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 px-4 py-2 transition-all duration-200 text-xs font-medium border border-transparent hover:border-white/10 glow-hover"
        >
            {icon}
            <span>{label}</span>
        </Button>
    );
}
