import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Paperclip, Globe, Mic } from 'lucide-react';
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
        <div className="relative w-full max-w-3xl mx-auto">
            <div className="relative flex items-end w-full p-2 bg-[#111] border border-white/10 rounded-lg focus-within:border-white/20 transition-all">
                <Button variant="ghost" size="icon" className="mb-1 text-gray-500 hover:text-white hover:bg-white/5 rounded-md w-9 h-9">
                    <Paperclip size={18} />
                </Button>

                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything..."
                    rows={1}
                    disabled={disabled}
                    className="flex-1 max-h-[200px] py-2 px-3 bg-transparent border-none resize-none focus:outline-none text-base text-white placeholder-gray-600 disabled:opacity-50 font-sans leading-relaxed"
                />

                <div className="flex items-center gap-1 mb-1 mr-1">
                    <Button variant="ghost" size="icon" className="text-gray-500 hover:text-white hover:bg-white/5 rounded-md w-9 h-9">
                        <Globe size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-gray-500 hover:text-white hover:bg-white/5 rounded-md w-9 h-9">
                        <Mic size={18} />
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
                            "rounded-md transition-all duration-200 w-9 h-9 ml-1",
                            input.trim()
                                ? "bg-white text-black hover:bg-gray-200"
                                : "bg-white/5 text-gray-600 cursor-not-allowed"
                        )}
                    >
                        <SendHorizontal size={18} />
                    </Button>
                </div>
            </div>
            <div className="text-center mt-2 text-[10px] text-gray-700 font-mono uppercase tracking-widest">
                AI Generated Content
            </div>
        </div>
    );
}
