import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    SendHorizontal, Paperclip, Mic, ChevronDown, X,
    Plus, Telescope, ShoppingBag, Image as ImageIcon,
    Lightbulb, MoreHorizontal, AudioLines
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
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute bottom-full left-0 mb-3 w-64 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="p-1.5 space-y-0.5">
                            <button
                                onClick={handleFileClick}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                            >
                                <Paperclip size={18} className="text-gray-400" />
                                <span>Add photos & files</span>
                            </button>

                            <div className="h-px bg-white/5 my-1" />

                            <button
                                onClick={() => {
                                    onToggleWebSearch?.();
                                    setShowPlusMenu(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors text-left",
                                    webSearchEnabled ? "text-orange-400 bg-orange-500/10" : "text-gray-300 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <Telescope size={18} className={webSearchEnabled ? "text-orange-400" : "text-gray-400"} />
                                <span>Deep research</span>
                                {webSearchEnabled && <span className="ml-auto text-[10px] font-medium opacity-60">ON</span>}
                            </button>

                            <button
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-500 hover:text-gray-400 hover:bg-white/5 rounded-lg transition-colors text-left cursor-not-allowed"
                            >
                                <ShoppingBag size={18} className="text-gray-600" />
                                <span>Shopping research</span>
                            </button>

                            <button
                                onClick={() => {
                                    setInput('/imagine ');
                                    textareaRef.current?.focus();
                                    setShowPlusMenu(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                            >
                                <ImageIcon size={18} className="text-gray-400" />
                                <span>Create image</span>
                            </button>

                            <button
                                onClick={() => {
                                    onToggleDeepThink?.();
                                    setShowPlusMenu(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors text-left",
                                    deepThinkEnabled ? "text-purple-400 bg-purple-500/10" : "text-gray-300 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <Lightbulb size={18} className={deepThinkEnabled ? "text-purple-400" : "text-gray-400"} />
                                <span>Thinking</span>
                                {deepThinkEnabled && <span className="ml-auto text-[10px] font-medium opacity-60">ON</span>}
                            </button>

                            <div className="h-px bg-white/5 my-1" />

                            <button
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                            >
                                <MoreHorizontal size={18} className="text-gray-400" />
                                <span>More</span>
                                <ChevronDown size={14} className="ml-auto text-gray-500 -rotate-90" />
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
