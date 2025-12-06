import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SendHorizontal, Globe, Paperclip, Mic, ChevronDown, X, Sparkles, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { SlashCommandMenu, type SlashCommand } from './ui/SlashCommandMenu';
import type { UploadedFile } from './ui/FileUpload';
import { MIRA_MODELS } from './ModelSelector';

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
    onChangeResponseStyle,
    selectedModel = 'gemini-2.0-flash',
    onModelChange,
    onFileRemove,
    attachedFiles = [],
    onVoiceTranscript,
}: ChatInputProps) {
    const [input, setInput] = useState('');
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [slashQuery, setSlashQuery] = useState('');
    const [showModelMenu, setShowModelMenu] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const modelMenuRef = useRef<HTMLDivElement>(null);

    const currentModel = MIRA_MODELS.find(m => m.id === selectedModel) || MIRA_MODELS[0];

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
            if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
                setShowModelMenu(false);
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
            if (showModelMenu) setShowModelMenu(false);
        }
    };

    const handleSend = () => {
        if (input.trim() && !disabled) {
            onSend(input, { enableWebSearch: webSearchEnabled, responseStyle, deepThink: deepThinkEnabled });
            setInput('');
        }
    };

    const handleFileClick = () => {
        // Trigger file upload dialog - we'll use the existing FileUpload component
        const fileInput = document.querySelector('input[type="file"][data-chat-upload]') as HTMLInputElement;
        if (fileInput) fileInput.click();
    };

    const toggleVoiceRecording = () => {
        if (!onVoiceTranscript) return;

        if (isRecording) {
            setIsRecording(false);
            // Voice recognition would stop here
        } else {
            setIsRecording(true);
            // Voice recognition would start here
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



            {/* Attached files preview */}
            <AnimatePresence>
                {attachedFiles.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mb-2 flex flex-wrap gap-2"
                    >
                        {attachedFiles.map(file => (
                            <div
                                key={file.id}
                                className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300"
                            >
                                <Paperclip size={12} />
                                <span className="max-w-[120px] truncate">{file.file.name}</span>
                                <button
                                    onClick={() => onFileRemove?.(file.id)}
                                    className="text-gray-500 hover:text-white"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main input container - Single unified row */}
            <div className={cn(
                "relative w-full bg-[#161b22]/90 backdrop-blur-xl rounded-2xl transition-all duration-200",
                "border border-[#30363d]/80 shadow-lg shadow-black/10"
            )}>
                <div className="flex items-end gap-1 p-2">
                    {/* Left actions - compact */}
                    <div className="flex items-center gap-1 pb-1">
                        {/* Model selector - compact dropdown */}
                        <div className="relative" ref={modelMenuRef}>
                            <button
                                onClick={() => setShowModelMenu(!showModelMenu)}
                                className={cn(
                                    "flex items-center gap-1.5 h-8 px-2 rounded-lg text-xs font-medium transition-all",
                                    showModelMenu
                                        ? "bg-white/10 text-white"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <Sparkles size={14} className="text-orange-400" />
                                <span className="hidden sm:inline">{currentModel.displayName}</span>
                                <ChevronDown size={12} className={cn(
                                    "transition-transform",
                                    showModelMenu && "rotate-180"
                                )} />
                            </button>

                            <AnimatePresence>
                                {showModelMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 8 }}
                                        className="absolute bottom-full left-0 mb-2 w-56 rounded-lg overflow-hidden
                                            bg-[#1a1a1a] border border-white/10 shadow-xl z-50"
                                    >
                                        {MIRA_MODELS.map(model => (
                                            <button
                                                key={model.id}
                                                onClick={() => {
                                                    onModelChange?.(model.id);
                                                    setShowModelMenu(false);
                                                }}
                                                className={cn(
                                                    "w-full flex flex-col items-start px-3 py-2.5 text-left transition-all",
                                                    selectedModel === model.id
                                                        ? "bg-orange-500/10 text-orange-400"
                                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                                )}
                                            >
                                                <span className="text-xs font-medium">{model.displayName}</span>
                                                <span className="text-[10px] text-gray-500">{model.description}</span>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* File upload button */}
                        <button
                            onClick={handleFileClick}
                            disabled={disabled}
                            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
                            title="Attach file"
                        >
                            <Paperclip size={16} />
                        </button>

                        {/* Voice input button */}
                        <button
                            onClick={toggleVoiceRecording}
                            disabled={disabled}
                            className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-lg transition-all disabled:opacity-50",
                                isRecording
                                    ? "bg-red-500/20 text-red-400 animate-pulse"
                                    : "text-gray-500 hover:text-white hover:bg-white/5"
                            )}
                            title="Voice input"
                        >
                            <Mic size={16} />
                        </button>

                        {/* Web search toggle */}
                        <button
                            onClick={onToggleWebSearch}
                            className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-lg transition-all",
                                webSearchEnabled
                                    ? "bg-orange-500/20 text-orange-400"
                                    : "text-gray-500 hover:text-white hover:bg-white/5"
                            )}
                            title={webSearchEnabled ? "Web search on" : "Web search off"}
                        >
                            <Globe size={16} />
                        </button>

                        {/* DeepThink toggle */}
                        <button
                            onClick={onToggleDeepThink}
                            className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-lg transition-all",
                                deepThinkEnabled
                                    ? "bg-purple-500/20 text-purple-400"
                                    : "text-gray-500 hover:text-white hover:bg-white/5"
                            )}
                            title={deepThinkEnabled ? "Deep thinking on" : "Deep thinking off"}
                        >
                            <Brain size={16} />
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-6 bg-white/10 mx-1 mb-1" />

                    {/* Textarea */}
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything..."
                        rows={1}
                        disabled={disabled}
                        className="flex-1 max-h-[160px] py-2 px-2 bg-transparent border-none resize-none focus:outline-none text-[15px] text-white placeholder-gray-500 disabled:opacity-50 leading-relaxed"
                    />

                    {/* Response style & Send */}
                    <div className="flex items-center gap-1 pb-1">
                        {/* Response style toggle - minimal */}
                        <div className="hidden sm:flex items-center gap-0.5 rounded-lg bg-white/5 p-0.5">
                            {(['concise', 'detailed'] as const).map((style) => (
                                <button
                                    key={style}
                                    type="button"
                                    onClick={() => onChangeResponseStyle(style)}
                                    className={cn(
                                        'text-[10px] px-2 py-1 rounded transition-all font-medium',
                                        responseStyle === style
                                            ? 'bg-white text-black'
                                            : 'text-gray-500 hover:text-white'
                                    )}
                                >
                                    {style === 'concise' ? 'Brief' : 'Full'}
                                </button>
                            ))}
                        </div>

                        {/* Send Button */}
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || disabled}
                            size="icon"
                            className={cn(
                                "rounded-lg transition-all duration-200 w-8 h-8 shrink-0",
                                input.trim()
                                    ? "bg-white text-black hover:bg-gray-200"
                                    : "bg-white/5 text-gray-600 cursor-not-allowed"
                            )}
                        >
                            <SendHorizontal size={16} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Minimal hint */}
            <div className="text-center mt-2">
                <span className="text-[10px] text-gray-600">
                    Type <kbd className="px-1 py-0.5 rounded bg-white/5 text-gray-500 font-mono text-[9px]">/</kbd> for commands
                </span>
            </div>
        </div>
    );
}

// Re-export SlashCommand type for convenience
export type { SlashCommand } from './ui/SlashCommandMenu';
