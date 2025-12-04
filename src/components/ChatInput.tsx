import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Paperclip, Globe, Mic, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [input]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim() && !disabled) {
                onSend(input);
                setInput('');
            }
        }
    };

    return (
        <div className="relative w-full max-w-4xl mx-auto">
            <div className="relative flex items-end w-full p-2 bg-[#09090b]/90 backdrop-blur-xl border border-white/10 rounded-3xl focus-within:ring-1 focus-within:ring-orange-500/30 focus-within:border-orange-500/30 transition-all shadow-2xl">
                <Button variant="ghost" size="icon" className="mb-1 text-gray-400 hover:text-white hover:bg-white/5 rounded-full">
                    <Paperclip size={20} />
                </Button>

                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Mira anything..."
                    rows={1}
                    disabled={disabled}
                    className="flex-1 max-h-[200px] py-3 px-4 bg-transparent border-none resize-none focus:outline-none text-lg text-white placeholder-gray-500 disabled:opacity-50"
                />

                <div className="flex items-center gap-2 mb-1 mr-1">
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full">
                        <Globe size={20} />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full">
                        <Mic size={20} />
                    </Button>
                    <Button
                        onClick={() => {
                            if (input.trim() && !disabled) {
                                onSend(input);
                                setInput('');
                            }
                        }}
                        disabled={!input.trim() || disabled}
                        size="icon"
                        className={cn(
                            "rounded-full transition-all duration-200 w-10 h-10",
                            input.trim()
                                ? "bg-orange-600 text-white hover:bg-orange-700 shadow-[0_0_15px_rgba(234,88,12,0.3)]"
                                : "bg-white/5 text-gray-500 cursor-not-allowed"
                        )}
                    >
                        <SendHorizontal size={20} />
                    </Button>
                </div>
            </div>
            <div className="text-center mt-3 text-xs text-gray-500 flex items-center justify-center gap-1.5">
                <Sparkles className="w-3 h-3 text-orange-500" />
                Mira can make mistakes. Please verify important information.
            </div>
        </div>
    );
}
