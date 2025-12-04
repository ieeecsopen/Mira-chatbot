import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Paperclip, Globe } from 'lucide-react';
import { cn } from '../lib/utils';

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
        <div className="relative w-full max-w-3xl mx-auto">
            <div className="relative flex items-end w-full p-3 bg-muted/50 border border-border rounded-2xl focus-within:ring-1 focus-within:ring-white/20 transition-all">
                <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                    <Paperclip size={20} />
                </button>

                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything..."
                    rows={1}
                    disabled={disabled}
                    className="flex-1 max-h-[200px] py-2 px-3 bg-transparent border-none resize-none focus:outline-none text-base disabled:opacity-50"
                />

                <div className="flex items-center gap-1">
                    <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                        <Globe size={20} />
                    </button>
                    <button
                        onClick={() => {
                            if (input.trim() && !disabled) {
                                onSend(input);
                                setInput('');
                            }
                        }}
                        disabled={!input.trim() || disabled}
                        className={cn(
                            "p-2 rounded-full transition-all duration-200",
                            input.trim()
                                ? "bg-white text-black hover:bg-gray-200"
                                : "bg-transparent text-muted-foreground cursor-not-allowed"
                        )}
                    >
                        <SendHorizontal size={20} />
                    </button>
                </div>
            </div>
            <div className="text-center mt-2 text-xs text-muted-foreground">
                MIRA can make mistakes. Check important info.
            </div>
        </div>
    );
}
