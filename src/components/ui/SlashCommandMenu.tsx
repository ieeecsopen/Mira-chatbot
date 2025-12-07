import { useState, useEffect, useRef, useCallback } from 'react';
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
    Command
} from 'lucide-react';

export interface SlashCommand {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    shortcut?: string;
    category: 'actions' | 'models' | 'tools' | 'help';
}

interface SlashCommandMenuProps {
    isOpen: boolean;
    searchQuery: string;
    onSelect: (command: SlashCommand) => void;
    onClose: () => void;
    position?: { top: number; left: number };
}

// Default slash commands
export const defaultSlashCommands: SlashCommand[] = [
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
    {
        id: 'template',
        name: 'Templates',
        description: 'Use a prompt template',
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
    {
        id: 'shortcuts',
        name: 'Keyboard Shortcuts',
        description: 'View all shortcuts',
        icon: <Command size={16} />,
        category: 'help'
    },
];

const categoryLabels: Record<string, string> = {
    actions: 'Actions',
    models: 'Models & Modes',
    tools: 'Tools',
    help: 'Help & Settings'
};

const categoryOrder = ['actions', 'tools', 'models', 'help'];

export function SlashCommandMenu({
    isOpen,
    searchQuery,
    onSelect,
    onClose
}: SlashCommandMenuProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    // Filter commands based on search query
    const filteredCommands = defaultSlashCommands.filter(cmd => {
        const query = searchQuery.toLowerCase().replace('/', '');
        return (
            cmd.name.toLowerCase().includes(query) ||
            cmd.description.toLowerCase().includes(query) ||
            cmd.id.toLowerCase().includes(query)
        );
    });

    // Group commands by category
    const groupedCommands = categoryOrder.reduce((acc, category) => {
        const categoryCommands = filteredCommands.filter(cmd => cmd.category === category);
        if (categoryCommands.length > 0) {
            acc[category] = categoryCommands;
        }
        return acc;
    }, {} as Record<string, SlashCommand[]>);

    // Flatten for keyboard navigation
    const flatCommands = categoryOrder.flatMap(cat => groupedCommands[cat] || []);

    // Reset selection when filtered list changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery]);

    // Scroll selected item into view
    useEffect(() => {
        if (itemRefs.current[selectedIndex]) {
            itemRefs.current[selectedIndex]?.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }, [selectedIndex]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isOpen) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < flatCommands.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : flatCommands.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (flatCommands[selectedIndex]) {
                    onSelect(flatCommands[selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                onClose();
                break;
            case 'Tab':
                e.preventDefault();
                if (e.shiftKey) {
                    setSelectedIndex(prev =>
                        prev > 0 ? prev - 1 : flatCommands.length - 1
                    );
                } else {
                    setSelectedIndex(prev =>
                        prev < flatCommands.length - 1 ? prev + 1 : 0
                    );
                }
                break;
        }
    }, [isOpen, flatCommands, selectedIndex, onSelect, onClose]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    let itemIndex = 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute bottom-full left-0 right-0 mb-2 mx-2 max-h-[360px] overflow-hidden rounded-lg border border-[#30363d]/50 bg-[#0d1117] shadow-2xl z-50"
                >
                    {/* Commands list - No header or footer for minimalism */}
                    <div className="overflow-y-auto max-h-[360px] py-1.5">
                        {flatCommands.length === 0 ? (
                            <div className="px-4 py-12 text-center">
                                <p className="text-sm text-[#8b949e]">No commands found</p>
                            </div>
                        ) : (
                            Object.entries(groupedCommands).map(([category, commands], catIndex) => (
                                <div key={category} className={catIndex > 0 ? 'mt-1' : ''}>
                                    {/* Category divider - subtle line only */}
                                    {catIndex > 0 && (
                                        <div className="mx-3 my-1.5 border-t border-[#30363d]/30" />
                                    )}
                                    {commands.map((command) => {
                                        const currentIndex = itemIndex++;
                                        const isSelected = currentIndex === selectedIndex;

                                        return (
                                            <button
                                                key={command.id}
                                                ref={el => { itemRefs.current[currentIndex] = el; }}
                                                onClick={() => onSelect(command)}
                                                onMouseEnter={() => setSelectedIndex(currentIndex)}
                                                className={`w-full px-3 py-2 flex items-center gap-2.5 text-left transition-all duration-100 ${isSelected
                                                        ? 'bg-orange-500/5 border-l-2 border-orange-500'
                                                        : 'border-l-2 border-transparent hover:bg-[#161b22]'
                                                    }`}
                                            >
                                                <span className={`flex-shrink-0 transition-colors ${isSelected
                                                        ? 'text-orange-400'
                                                        : 'text-[#8b949e]'
                                                    }`}>
                                                    {command.icon}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <span className={`block text-sm font-normal ${isSelected ? 'text-white' : 'text-[#c9d1d9]'}`}>
                                                        {command.name}
                                                    </span>
                                                    <p className="text-[11px] text-[#8b949e] truncate mt-0.5">
                                                        {command.description}
                                                    </p>
                                                </div>
                                                {command.shortcut && (
                                                    <span className="text-[10px] text-[#6e7681] flex-shrink-0 font-mono">
                                                        {command.shortcut}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
