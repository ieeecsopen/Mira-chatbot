import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Plus, Trash2, X, Tag, Sparkles, User, Briefcase, Settings2, HelpCircle } from 'lucide-react';
import { Button } from './button';
import { useMemory, type MemoryItem } from '../../lib/userMemory';
import { showSuccess, showError } from '../../lib/toast';

interface MemoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const categoryIcons: Record<MemoryItem['category'], React.ReactNode> = {
    personal: <User size={14} />,
    work: <Briefcase size={14} />,
    preference: <Settings2 size={14} />,
    context: <Sparkles size={14} />,
    other: <HelpCircle size={14} />,
};

const categoryLabels: Record<MemoryItem['category'], string> = {
    personal: 'Personal',
    work: 'Work',
    preference: 'Preference',
    context: 'Context',
    other: 'Other',
};

export function MemoryPanel({ isOpen, onClose }: MemoryPanelProps) {
    const { memories, add, remove, clear } = useMemory();
    const [newMemory, setNewMemory] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<MemoryItem['category']>('other');
    const [isAdding, setIsAdding] = useState(false);

    const handleAdd = useCallback(() => {
        if (!newMemory.trim()) return;

        add(newMemory.trim(), selectedCategory);
        setNewMemory('');
        setIsAdding(false);
        showSuccess('Memory added!');
    }, [newMemory, selectedCategory, add]);

    const handleRemove = useCallback((id: string) => {
        remove(id);
        showSuccess('Memory removed');
    }, [remove]);

    const handleClearAll = useCallback(() => {
        if (confirm('Are you sure you want to clear all memories? This cannot be undone.')) {
            clear();
            showSuccess('All memories cleared');
        }
    }, [clear]);

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, x: 300 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 300 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50"
                    >
                        <div className="h-full bg-[#0d1117] border-l border-[#30363d] flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-purple-500/10">
                                        <Brain size={20} className="text-purple-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">Memory</h2>
                                        <p className="text-sm text-[#8b949e]">
                                            {memories.length} items saved
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg text-[#8b949e] hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {/* Add Memory Section */}
                                {isAdding ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-4 p-4 rounded-lg bg-[#161b22] border border-[#30363d]"
                                    >
                                        <textarea
                                            value={newMemory}
                                            onChange={(e) => setNewMemory(e.target.value)}
                                            placeholder="What should I remember about you?"
                                            className="w-full h-20 p-3 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#c9d1d9] text-sm resize-none focus:outline-none focus:border-purple-500"
                                            autoFocus
                                        />

                                        {/* Category Selection */}
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {(Object.keys(categoryLabels) as MemoryItem['category'][]).map((cat) => (
                                                <button
                                                    key={cat}
                                                    onClick={() => setSelectedCategory(cat)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedCategory === cat
                                                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                                            : 'bg-[#0d1117] text-[#8b949e] hover:text-white border border-[#30363d]'
                                                        }`}
                                                >
                                                    {categoryIcons[cat]}
                                                    {categoryLabels[cat]}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex gap-2 mt-3">
                                            <Button
                                                onClick={() => setIsAdding(false)}
                                                variant="ghost"
                                                className="flex-1 text-[#8b949e]"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleAdd}
                                                disabled={!newMemory.trim()}
                                                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
                                            >
                                                Save Memory
                                            </Button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <Button
                                        onClick={() => setIsAdding(true)}
                                        variant="outline"
                                        className="w-full mb-4 border-dashed border-[#30363d] text-[#8b949e] hover:text-white hover:border-purple-500/50"
                                    >
                                        <Plus size={16} className="mr-2" />
                                        Add Memory
                                    </Button>
                                )}

                                {/* Memory List */}
                                {memories.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Brain size={48} className="mx-auto text-[#30363d] mb-4" />
                                        <p className="text-[#8b949e] mb-2">No memories yet</p>
                                        <p className="text-sm text-[#6e7681]">
                                            Add facts about yourself that Mira should remember
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {memories.map((memory) => (
                                            <motion.div
                                                key={memory.id}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="group p-3 rounded-lg bg-[#161b22] border border-[#30363d] hover:border-[#30363d]/80"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-sm text-[#c9d1d9] flex-1">
                                                        {memory.content}
                                                    </p>
                                                    <button
                                                        onClick={() => handleRemove(memory.id)}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-[#8b949e] hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2 text-xs text-[#6e7681]">
                                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0d1117]">
                                                        <Tag size={10} />
                                                        {categoryLabels[memory.category]}
                                                    </span>
                                                    <span>{formatDate(memory.createdAt)}</span>
                                                    {memory.source === 'auto' && (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
                                                            <Sparkles size={10} />
                                                            Auto
                                                        </span>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            {memories.length > 0 && (
                                <div className="px-4 py-3 border-t border-[#30363d]">
                                    <button
                                        onClick={handleClearAll}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                        Clear All Memories
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
