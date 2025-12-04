import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SendHorizontal, Search } from 'lucide-react';
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
        setSlashQuery('');

        // For imagine command, insert the command prefix and let user type the prompt
        if (command.id === 'imagine') {
            setInput('/imagine ');
            // Focus the textarea
            textareaRef.current?.focus();
            return;
        }

        setInput('');
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
            <div className="relative w-full bg-[#161b22]/80 backdrop-blur-xl rounded-2xl transition-all border border-[#30363d] shadow-lg shadow-black/20">
                {/* Web search badge - top of container */}
                {webSearchEnabled && (
                    <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#30363d]/50">
                        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
                            <Search size={14} className="text-orange-400" />
                            <span className="text-xs text-orange-400 font-medium">Web Search Active</span>
                        </div>
                    </div>
                )}

                {/* Input area */}
                <div className="flex items-end gap-2 p-3">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={webSearchEnabled ? "Search the web..." : "Ask anything... (type / for commands)"}
                        rows={1}
                        disabled={disabled}
                        className="flex-1 max-h-[200px] py-2.5 px-4 bg-transparent border-none resize-none focus:outline-none text-base text-white placeholder-gray-500 disabled:opacity-50 font-sans leading-relaxed"
                    />

                    {/* Action buttons - better aligned */}
                    <div className="flex items-center gap-2 pb-2">
                        {/* Web Search Toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleWebSearch}
                            className={cn(
                                "rounded-full w-10 h-10 transition-all shrink-0",
                                webSearchEnabled
                                    ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                                    : "text-gray-400 hover:text-white hover:bg-white/10"
                            )}
                            title={webSearchEnabled ? "Disable web search" : "Enable web search"}
                        >
                            <Search size={20} />
                        </Button>

                        {/* Send Button */}
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
                                "rounded-full transition-all duration-200 w-10 h-10 shrink-0 glow-hover",
                                input.trim()
                                    ? "bg-white text-black hover:bg-gray-200 shadow-lg shadow-white/20"
                                    : "bg-white/5 text-gray-600 cursor-not-allowed"
                            )}
                        >
                            <SendHorizontal size={20} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Bottom indicator - only show when web search is off */}
            {!webSearchEnabled && (
                <div className="text-center mt-3 text-[10px] text-gray-600 font-mono uppercase tracking-widest">
                    AI Generated Content
                </div>
            )}
        </div>
    );
}

// Re-export SlashCommand type for convenience
export type { SlashCommand } from './ui/SlashCommandMenu';
