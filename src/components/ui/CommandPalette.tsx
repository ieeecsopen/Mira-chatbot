import { useEffect, useState, useCallback } from 'react';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trash2,
    Bot,
    Upload,
    Search,
    MessageSquare,
    Sparkles,
    Code,
    Image,
    FileText,
    Zap,
    Settings,
    HelpCircle,
    X,
} from 'lucide-react';
import type { SlashCommand } from './SlashCommandMenu';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (command: SlashCommand) => void;
}

// Command definitions
const commands: SlashCommand[] = [
    // Actions
    {
        id: 'clear',
        name: 'Clear Chat',
        description: 'Start a fresh conversation',
        icon: <Trash2 size={16} />,
        shortcut: '⌘⇧K',
        category: 'actions'
    },
    {
        id: 'new',
        name: 'New Chat',
        description: 'Create a new chat session',
        icon: <MessageSquare size={16} />,
        shortcut: '⌘N',
        category: 'actions'
    },
    {
        id: 'search',
        name: 'Search Messages',
        description: 'Search through chat history',
        icon: <Search size={16} />,
        shortcut: '⌘F',
        category: 'actions'
    },
    // Tools
    {
        id: 'upload',
        name: 'Upload File',
        description: 'Attach a file to your message',
        icon: <Upload size={16} />,
        category: 'tools'
    },
    {
        id: 'docs',
        name: 'Documents',
        description: 'Upload & chat with PDF, DOCX, or text files',
        icon: <FileText size={16} />,
        category: 'tools'
    },
    {
        id: 'web',
        name: 'Web Search',
        description: 'Toggle web search for real-time info',
        icon: <Search size={16} />,
        category: 'tools'
    },
    {
        id: 'code',
        name: 'Code Block',
        description: 'Insert a code snippet',
        icon: <Code size={16} />,
        category: 'tools'
    },
    {
        id: 'imagine',
        name: 'Generate Image',
        description: 'Create an AI image (e.g., /imagine a sunset)',
        icon: <Image size={16} />,
        category: 'tools'
    },
    {
        id: 'summarize',
        name: 'Summarize',
        description: 'Summarize the conversation',
        icon: <FileText size={16} />,
        category: 'tools'
    },
    // Models
    {
        id: 'model',
        name: 'Change Model',
        description: 'Switch AI model',
        icon: <Bot size={16} />,
        category: 'models'
    },
    {
        id: 'creative',
        name: 'Creative Mode',
        description: 'More creative responses',
        icon: <Sparkles size={16} />,
        category: 'models'
    },
    {
        id: 'fast',
        name: 'Fast Mode',
        description: 'Quick, concise responses',
        icon: <Zap size={16} />,
        category: 'models'
    },
    // Help
    {
        id: 'settings',
        name: 'Settings',
        description: 'Open settings panel',
        icon: <Settings size={16} />,
        category: 'help'
    },
    {
        id: 'help',
        name: 'Help',
        description: 'Show available commands',
        icon: <HelpCircle size={16} />,
        category: 'help'
    },
];

const categoryLabels: Record<string, string> = {
    actions: 'Actions',
    tools: 'Tools',
    models: 'Models & Modes',
    help: 'Help & Settings'
};

export function CommandPalette({ isOpen, onClose, onSelect }: CommandPaletteProps) {
    const [search, setSearch] = useState('');

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    // Reset search when opened
    useEffect(() => {
        if (isOpen) {
            setSearch('');
        }
    }, [isOpen]);

    const handleSelect = useCallback((command: SlashCommand) => {
        onSelect(command);
        onClose();
    }, [onSelect, onClose]);

    // Group commands by category
    const groupedCommands = commands.reduce((acc, cmd) => {
        if (!acc[cmd.category]) {
            acc[cmd.category] = [];
        }
        acc[cmd.category].push(cmd);
        return acc;
    }, {} as Record<string, SlashCommand[]>);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Command Palette */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50"
                    >
                        <Command
                            className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden"
                            loop
                        >
                            {/* Search Input */}
                            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#30363d]">
                                <Search size={18} className="text-[#8b949e]" />
                                <Command.Input
                                    value={search}
                                    onValueChange={setSearch}
                                    placeholder="Type a command or search..."
                                    className="flex-1 bg-transparent border-none outline-none text-[#c9d1d9] placeholder-[#8b949e] text-sm"
                                    autoFocus
                                />
                                <button
                                    onClick={onClose}
                                    className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Commands List */}
                            <Command.List className="max-h-[400px] overflow-y-auto p-2">
                                <Command.Empty className="py-6 text-center text-[#8b949e] text-sm">
                                    No commands found.
                                </Command.Empty>

                                {Object.entries(groupedCommands).map(([category, cmds]) => (
                                    <Command.Group
                                        key={category}
                                        heading={categoryLabels[category]}
                                        className="mb-2"
                                    >
                                        <div className="px-2 py-1.5 text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider">
                                            {categoryLabels[category]}
                                        </div>
                                        {cmds.map((cmd) => (
                                            <Command.Item
                                                key={cmd.id}
                                                value={`${cmd.name} ${cmd.description}`}
                                                onSelect={() => handleSelect(cmd)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-[#c9d1d9] data-[selected=true]:bg-orange-500/10 data-[selected=true]:text-white transition-colors"
                                            >
                                                <span className="flex-shrink-0 p-1.5 rounded-md bg-[#21262d] text-[#8b949e] data-[selected=true]:bg-orange-500/20 data-[selected=true]:text-orange-400">
                                                    {cmd.icon}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm">{cmd.name}</span>
                                                        {cmd.shortcut && (
                                                            <span className="text-[10px] text-[#8b949e] bg-[#21262d] px-1.5 py-0.5 rounded">
                                                                {cmd.shortcut}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-[#8b949e] truncate">
                                                        {cmd.description}
                                                    </p>
                                                </div>
                                            </Command.Item>
                                        ))}
                                    </Command.Group>
                                ))}
                            </Command.List>

                            {/* Footer */}
                            <div className="px-4 py-2 border-t border-[#30363d] bg-[#0d1117]/50 flex items-center justify-between text-[10px] text-[#8b949e]">
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1">
                                        <kbd className="px-1.5 py-0.5 bg-[#21262d] rounded text-[#c9d1d9]">↑↓</kbd>
                                        navigate
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <kbd className="px-1.5 py-0.5 bg-[#21262d] rounded text-[#c9d1d9]">↵</kbd>
                                        select
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <kbd className="px-1.5 py-0.5 bg-[#21262d] rounded text-[#c9d1d9]">esc</kbd>
                                        close
                                    </span>
                                </div>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-[#21262d] rounded text-[#c9d1d9]">⌘K</kbd>
                                    to open
                                </span>
                            </div>
                        </Command>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
