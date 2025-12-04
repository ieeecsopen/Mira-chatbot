"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "./textarea";
import { Button } from "./button";
import { cn } from "../../lib/utils";
import {
    ImageIcon,
    FileUp,
    MonitorIcon,
    CircleUserRound,
    ArrowUpIcon,
    Paperclip,
    Code2,
    Palette,
    Layers,
    Rocket,
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
        <div
            className="relative w-full h-screen bg-cover bg-center flex flex-col items-center"
            style={{
                backgroundImage:
                    "url('https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/ruixen_moon_2.png')",
                backgroundAttachment: "fixed",
            }}
        >
            {/* Darker Overlay for better contrast */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />

            {/* Centered AI Title */}
            <div className="flex-1 w-full flex flex-col items-center justify-center relative z-10">
                <div className="text-center">
                    <h1 className="text-6xl font-bold text-white drop-shadow-lg tracking-tight">
                        Ruixen AI
                    </h1>
                    <p className="mt-4 text-xl text-neutral-100 font-medium drop-shadow-md">
                        Build something amazing — just start typing below.
                    </p>
                </div>
            </div>

            {/* Input Box Section */}
            <div className="w-full max-w-4xl mb-[20vh] relative z-10 px-4">
                <div className="relative bg-black/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl">
                    <Textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => {
                            setMessage(e.target.value);
                            adjustHeight();
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your request..."
                        className={cn(
                            "w-full px-6 py-5 resize-none border-none",
                            "bg-transparent text-white text-xl leading-relaxed",
                            "focus-visible:ring-0 focus-visible:ring-offset-0",
                            "placeholder:text-neutral-400 min-h-[60px]"
                        )}
                        style={{ overflow: "hidden" }}
                    />

                    {/* Footer Buttons */}
                    <div className="flex items-center justify-between p-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-neutral-300 hover:text-white hover:bg-white/10 w-10 h-10"
                        >
                            <Paperclip className="w-6 h-6" />
                        </Button>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleSend}
                                disabled={!message.trim()}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-6 rounded-xl transition-all duration-200",
                                    message.trim()
                                        ? "bg-white text-black hover:bg-neutral-200 shadow-lg hover:shadow-xl"
                                        : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                )}
                            >
                                <span className="text-base font-semibold">Send</span>
                                <ArrowUpIcon className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center justify-center flex-wrap gap-4 mt-8">
                    <QuickAction icon={<Code2 className="w-5 h-5" />} label="Generate Code" />
                    <QuickAction icon={<Rocket className="w-5 h-5" />} label="Launch App" />
                    <QuickAction icon={<Layers className="w-5 h-5" />} label="UI Components" />
                    <QuickAction icon={<Palette className="w-5 h-5" />} label="Theme Ideas" />
                    <QuickAction icon={<CircleUserRound className="w-5 h-5" />} label="User Dashboard" />
                    <QuickAction icon={<MonitorIcon className="w-5 h-5" />} label="Landing Page" />
                    <QuickAction icon={<FileUp className="w-5 h-5" />} label="Upload Docs" />
                    <QuickAction icon={<ImageIcon className="w-5 h-5" />} label="Image Assets" />
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
            variant="outline"
            className="flex items-center gap-3 rounded-full border-white/10 bg-black/60 text-neutral-200 hover:text-white hover:bg-white/10 hover:border-white/30 px-6 py-6 transition-all duration-200 backdrop-blur-sm"
        >
            {icon}
            <span className="text-sm font-medium">{label}</span>
        </Button>
    );
}
