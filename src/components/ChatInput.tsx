import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SendHorizontal, Paperclip, Globe, Mic, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { SlashCommandMenu, type SlashCommand } from './ui/SlashCommandMenu';

interface ChatInputProps {
    onSend: (message: string, options?: { enableWebSearch?: boolean }) => void;
    disabled?: boolean;
    onSlashCommand?: (command: SlashCommand) => void;
    webSearchEnabled?: boolean;
    onToggleWebSearch?: () => void;
}

export function ChatInput({ onSend, disabled, onSlashCommand, webSearchEnabled, onToggleWebSearch }: ChatInputProps) {
    const [input, setInput] = useState('');
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [slashQuery, setSlashQuery] = useState('');
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

    // Handle slash command detection
    useEffect(() => {
        // Check if input starts with / and we're at the beginning
        if (input.startsWith('/') && !input.includes(' ')) {
            setShowSlashMenu(true);
            setSlashQuery(input);
        } else {
            setShowSlashMenu(false);
            setSlashQuery('');
        }
    }, [input]);

    const handleSlashSelect = useCallback((command: SlashCommand) => {
        setShowSlashMenu(false);
        setInput('');
        setSlashQuery('');
        onSlashCommand?.(command);
    }, [onSlashCommand]);

    const handleCloseSlashMenu = useCallback(() => {
        setShowSlashMenu(false);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Don't handle Enter if slash menu is open (it handles its own)
        if (showSlashMenu && (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Tab')) {
            return; // Let the menu handle it
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim() && !disabled && !showSlashMenu) {
                onSend(input, { enableWebSearch: webSearchEnabled });
                setInput('');
            }
        }

        // Close slash menu on Escape
        if (e.key === 'Escape' && showSlashMenu) {
            setShowSlashMenu(false);
        }
    };

    return (
        <div className="relative w-full max-w-3xl mx-auto">
            {/* Slash Command Menu */}
            <SlashCommandMenu
                isOpen={showSlashMenu}
                searchQuery={slashQuery}
                onSelect={handleSlashSelect}
                onClose={handleCloseSlashMenu}
            />

            {/* Glassmorphism input container */}
            <div className="relative flex items-end w-full p-2 bg-[#1a1a1a]/80 backdrop-blur-xl rounded-2xl transition-all border border-white/[0.08] shadow-lg shadow-black/20">
                <Button variant="ghost" size="icon" className="mb-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-full w-9 h-9">
                    <Paperclip size={18} />
                </Button>

                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={webSearchEnabled ? "Search the web..." : "Ask anything... (type / for commands)"}
                    rows={1}
                    disabled={disabled}
                    className="flex-1 max-h-[200px] py-2 px-3 bg-transparent border-none resize-none focus:outline-none text-base text-white placeholder-gray-500 disabled:opacity-50 font-sans leading-relaxed"
                />

                <div className="flex items-center gap-1 mb-1 mr-1">
                    {/* Web Search Toggle */}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onToggleWebSearch}
                        className={cn(
                            "rounded-full w-9 h-9 transition-all",
                            webSearchEnabled 
                                ? "bg-[#58a6ff]/20 text-[#58a6ff] hover:bg-[#58a6ff]/30" 
                                : "text-gray-400 hover:text-white hover:bg-white/10"
                        )}
                        title={webSearchEnabled ? "Web search enabled" : "Enable web search"}
                    >
                        <Search size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full w-9 h-9">
                        <Globe size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full w-9 h-9">
                        <Mic size={18} />
                    </Button>
                    <Button
                        onClick={() => {
                            if (input.trim() && !disabled) {
                                onSend(input, { enableWebSearch: webSearchEnabled });
                                setInput('');
                            }
                        }}
                        disabled={!input.trim() || disabled}
                        size="icon"
                        className={cn(
                            "rounded-full transition-all duration-200 w-9 h-9 ml-1 glow-hover",
                            input.trim()
                                ? "bg-white text-black hover:bg-gray-200"
                                : "bg-white/5 text-gray-600 cursor-not-allowed"
                        )}
                    >
                        <SendHorizontal size={18} />
                    </Button>
                </div>
            </div>
            
            {/* Web search indicator */}
            {webSearchEnabled && (
                <div className="flex items-center justify-center gap-2 mt-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#58a6ff]/10 border border-[#58a6ff]/20">
                        <Search size={12} className="text-[#58a6ff]" />
                        <span className="text-[10px] text-[#58a6ff] font-medium">Web Search Active</span>
                    </div>
                </div>
            )}
            
            {!webSearchEnabled && (
                <div className="text-center mt-2 text-[10px] text-gray-600 font-mono uppercase tracking-widest">
                    AI Generated Content
                </div>
            )}
        </div>
    );
}

// Re-export SlashCommand type for convenience
export type { SlashCommand } from './ui/SlashCommandMenu';
