import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    SendHorizontal, Paperclip, Mic, X,
    Plus, Telescope, ShoppingBag,
    Lightbulb, AudioLines, FileUp, Sparkles, Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { SlashCommandMenu, type SlashCommand } from './ui/SlashCommandMenu';
import type { UploadedFile } from './ui/FileUpload';

interface ChatInputProps {
    onSend: (message: string, options?: { enableWebSearch?: boolean; responseStyle?: 'concise' | 'detailed'; deepThink?: boolean }) => void;
    disabled?: boolean;
    onSlashCommand?: (command: SlashCommand) => void;
    webSearchEnabled?: boolean;
    onToggleWebSearch?: () => void;
    deepThinkEnabled?: boolean;
    onToggleDeepThink?: () => void;
    responseStyle: 'concise' | 'detailed';
    onChangeResponseStyle: (style: 'concise' | 'detailed') => void;
    // New integrated props
    selectedModel?: string;
    onModelChange?: (modelId: string) => void;
    onFilesSelected?: (files: UploadedFile[]) => void;
    onFileRemove?: (fileId: string) => void;
    attachedFiles?: UploadedFile[];
    onVoiceTranscript?: (text: string) => void;
    onDocumentsChange?: () => void;
}

export function ChatInput({
    onSend,
    disabled,
    onSlashCommand,
    webSearchEnabled,
    onToggleWebSearch,
    deepThinkEnabled,
    onToggleDeepThink,
    responseStyle,
    onChangeResponseStyle: _onChangeResponseStyle,
    selectedModel: _selectedModel = 'gemini-2.0-flash',
    onModelChange: _onModelChange,
    onFileRemove,
    attachedFiles = [],
    onVoiceTranscript,
}: ChatInputProps) {
    const [input, setInput] = useState('');
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [slashQuery, setSlashQuery] = useState('');
    const [showPlusMenu, setShowPlusMenu] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const plusMenuRef = useRef<HTMLDivElement>(null);

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [input]);

    // Handle slash command detection
    useEffect(() => {
        if (input.startsWith('/') && !input.includes(' ')) {
            setShowSlashMenu(true);
            setSlashQuery(input);
        } else {
            setShowSlashMenu(false);
            setSlashQuery('');
        }
    }, [input]);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
                setShowPlusMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSlashSelect = useCallback((command: SlashCommand) => {
        setShowSlashMenu(false);
        setSlashQuery('');

        if (command.id === 'imagine') {
            setInput('/imagine ');
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
        if (showSlashMenu && (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Tab')) {
            return;
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim() && !disabled && !showSlashMenu) {
                onSend(input, { enableWebSearch: webSearchEnabled, responseStyle, deepThink: deepThinkEnabled });
                setInput('');
            }
        }

        if (e.key === 'Escape') {
            if (showSlashMenu) setShowSlashMenu(false);
            if (showPlusMenu) setShowPlusMenu(false);
        }
    };

    const handleSend = () => {
        if (input.trim() && !disabled) {
            onSend(input, { enableWebSearch: webSearchEnabled, responseStyle, deepThink: deepThinkEnabled });
            setInput('');
        }
    };

    const handleFileClick = () => {
        // Trigger file upload dialog
        const fileInput = document.querySelector('input[type="file"][data-chat-upload]') as HTMLInputElement;
        if (fileInput) fileInput.click();
        setShowPlusMenu(false);
    };

    const toggleVoiceRecording = () => {
        if (!onVoiceTranscript) return;

        if (isRecording) {
            setIsRecording(false);
        } else {
            setIsRecording(true);
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Slash Command Menu */}
            <SlashCommandMenu
                isOpen={showSlashMenu}
                searchQuery={slashQuery}
                onSelect={handleSlashSelect}
                onClose={handleCloseSlashMenu}
            />

            {/* Plus Menu Popover */}
            <AnimatePresence>
                {showPlusMenu && (
                    <motion.div
                        ref={plusMenuRef}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute bottom-full left-0 mb-3 w-56 bg-[#0d1117] border border-[#30363d]/50 rounded-lg shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="py-1.5">
                            <button
                                onClick={handleFileClick}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#c9d1d9] hover:bg-[#161b22] transition-all border-l-2 border-transparent hover:border-l-orange-500"
                            >
                                <FileUp size={16} className="text-[#8b949e]" />
                                <span>Add photos & files</span>
                            </button>

                            <div className="mx-3 my-1.5 border-t border-[#30363d]/30" />

                            <button
                                onClick={() => {
                                    onToggleWebSearch?.();
                                    setShowPlusMenu(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-all border-l-2",
                                    webSearchEnabled 
                                        ? "text-orange-400 bg-orange-500/5 border-l-orange-500" 
                                        : "text-[#c9d1d9] hover:bg-[#161b22] border-transparent hover:border-l-orange-500"
                                )}
                            >
                                <Telescope size={16} className={webSearchEnabled ? "text-orange-400" : "text-[#8b949e]"} />
                                <span>Deep research</span>
                            </button>

                            <button
                                disabled
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#6e7681] opacity-40 cursor-not-allowed border-l-2 border-transparent"
                            >
                                <ShoppingBag size={16} className="text-[#6e7681]" />
                                <span>Shopping research</span>
                            </button>

                            <button
                                onClick={() => {
                                    setInput('/imagine ');
                                    textareaRef.current?.focus();
                                    setShowPlusMenu(false);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#c9d1d9] hover:bg-[#161b22] transition-all border-l-2 border-transparent hover:border-l-orange-500"
                            >
                                <Sparkles size={16} className="text-[#8b949e]" />
                                <span>Create image</span>
                            </button>

                            <button
                                onClick={() => {
                                    onToggleDeepThink?.();
                                    setShowPlusMenu(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-all border-l-2",
                                    deepThinkEnabled 
                                        ? "text-purple-300 bg-purple-500/5 border-l-purple-500" 
                                        : "text-[#c9d1d9] hover:bg-[#161b22] border-transparent hover:border-l-orange-500"
                                )}
                            >
                                <Brain size={16} className={deepThinkEnabled ? "text-purple-400" : "text-[#8b949e]"} />
                                <span>Deep Thinking</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Attached files preview */}
            <AnimatePresence>
                {attachedFiles.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mb-2 flex flex-wrap gap-2 px-1"
                    >
                        {attachedFiles.map(file => (
                            <div
                                key={file.id}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2a2a2a] border border-white/10 text-xs text-gray-300"
                            >
                                <Paperclip size={12} />
                                <span className="max-w-[120px] truncate">{file.file.name}</span>
                                <button
                                    onClick={() => onFileRemove?.(file.id)}
                                    className="text-gray-500 hover:text-white ml-1"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main input container - Rounded Pill Shape */}
            <div className={cn(
                "relative w-full bg-[#1a1a1a] rounded-[28px] transition-all duration-200",
                "border border-white/10 shadow-lg shadow-black/20 flex items-end p-2 gap-2"
            )}>
                {/* Plus Button */}
                <button
                    onClick={() => setShowPlusMenu(!showPlusMenu)}
                    className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full transition-all shrink-0",
                        showPlusMenu ? "bg-white text-black rotate-45" : "bg-[#2a2a2a] text-gray-400 hover:text-white hover:bg-[#333]"
                    )}
                >
                    <Plus size={20} />
                </button>

                {/* Textarea */}
                <div className="flex-1 py-2.5 min-h-[44px]">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything"
                        rows={1}
                        disabled={disabled}
                        className="w-full bg-transparent border-none resize-none focus:outline-none text-[16px] text-white placeholder-gray-500 disabled:opacity-50 leading-relaxed max-h-[200px]"
                    />
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-1 pb-1">
                    {/* Voice Input */}
                    <button
                        onClick={toggleVoiceRecording}
                        disabled={disabled}
                        className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-full transition-all disabled:opacity-50",
                            isRecording
                                ? "bg-red-500/20 text-red-400 animate-pulse"
                                : "text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
                        )}
                        title="Voice input"
                    >
                        <Mic size={20} />
                    </button>

                    {/* Voice Mode / Waveform - Only show when empty */}
                    {!input.trim() && (
                        <button
                            disabled={disabled}
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-white text-black hover:bg-gray-200 transition-all disabled:opacity-50 shrink-0"
                            title="Voice Mode"
                        >
                            <AudioLines size={20} />
                        </button>
                    )}

                    {/* Send Button - Only show when typing */}
                    {input.trim() && (
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || disabled}
                            size="icon"
                            className="rounded-full w-10 h-10 bg-white text-black hover:bg-gray-200 shadow-lg shrink-0"
                        >
                            <SendHorizontal size={20} />
                        </Button>
                    )}
                </div>
            </div>

            {/* Active Mode Indicators (below input) */}
            <div className="flex items-center gap-3 px-4 mt-2">
                {deepThinkEnabled && (
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/10 border border-purple-500/30"
                    >
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.7, 1, 0.7],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        >
                            <Lightbulb size={12} className="text-purple-400" />
                        </motion.div>
                        <span className="text-[10px] text-purple-300 font-semibold">Deep Thinking Mode</span>
                        <span className="text-[9px] text-purple-400/60">• Slower, more thorough responses</span>
                    </motion.div>
                )}
                {webSearchEnabled && (
                    <div className="flex items-center gap-1.5 text-[10px] text-orange-400 font-medium">
                        <Telescope size={12} />
                        <span>Deep Research Active</span>
                    </div>
                )}
                {deepThinkEnabled && (
                    <div className="flex items-center gap-1.5 text-[10px] text-purple-400 font-medium">
                        <Lightbulb size={12} />
                        <span>Thinking Mode Active</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// Re-export SlashCommand type for convenience
export type { SlashCommand } from './ui/SlashCommandMenu';
