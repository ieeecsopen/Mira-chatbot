import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Search,
    Plus,
    Trash2,
    Edit3,
    Check,
    ChevronDown,
} from 'lucide-react';
import { Button } from './button';
import {
    templateManager,
    categoryInfo,
    type ChatTemplate,
    type TemplateCategory,
} from '../../lib/chatTemplates';

interface TemplatePanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTemplate: (prompt: string) => void;
}

export function TemplatePanel({
    isOpen,
    onClose,
    onSelectTemplate,
}: TemplatePanelProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form state for creating/editing
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formPrompt, setFormPrompt] = useState('');
    const [formIcon, setFormIcon] = useState('📋');
    const [formCategory, setFormCategory] = useState<TemplateCategory>('custom');

    // Get all templates
    const allTemplates = templateManager.getAllTemplates();

    // Filter templates
    const filteredTemplates = useMemo(() => {
        let templates = allTemplates;

        // Filter by category
        if (selectedCategory !== 'all') {
            templates = templates.filter(t => t.category === selectedCategory);
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            templates = templates.filter(
                t =>
                    t.name.toLowerCase().includes(query) ||
                    t.description.toLowerCase().includes(query)
            );
        }

        return templates;
    }, [allTemplates, selectedCategory, searchQuery]);

    // Group templates by category for display
    const groupedTemplates = useMemo(() => {
        const groups: Record<string, ChatTemplate[]> = {};
        for (const template of filteredTemplates) {
            if (!groups[template.category]) {
                groups[template.category] = [];
            }
            groups[template.category].push(template);
        }
        return groups;
    }, [filteredTemplates]);

    const handleSelectTemplate = (template: ChatTemplate) => {
        onSelectTemplate(template.prompt);
        onClose();
    };

    const handleCreateTemplate = () => {
        if (!formName.trim() || !formPrompt.trim()) return;

        templateManager.createTemplate(
            formName.trim(),
            formDescription.trim() || 'Custom template',
            formPrompt,
            formCategory,
            formIcon
        );

        resetForm();
        setIsCreating(false);
    };

    const handleEditTemplate = (template: ChatTemplate) => {
        setEditingId(template.id);
        setFormName(template.name);
        setFormDescription(template.description);
        setFormPrompt(template.prompt);
        setFormIcon(template.icon);
        setFormCategory(template.category);
    };

    const handleSaveEdit = () => {
        if (!editingId || !formName.trim() || !formPrompt.trim()) return;

        templateManager.updateTemplate(editingId, {
            name: formName.trim(),
            description: formDescription.trim(),
            prompt: formPrompt,
            icon: formIcon,
            category: formCategory,
        });

        resetForm();
        setEditingId(null);
    };

    const handleDeleteTemplate = (id: string) => {
        templateManager.deleteTemplate(id);
        if (editingId === id) {
            resetForm();
            setEditingId(null);
        }
    };

    const resetForm = () => {
        setFormName('');
        setFormDescription('');
        setFormPrompt('');
        setFormIcon('📋');
        setFormCategory('custom');
    };

    const startCreating = () => {
        resetForm();
        setEditingId(null);
        setIsCreating(true);
    };

    const categories: (TemplateCategory | 'all')[] = ['all', 'writing', 'coding', 'analysis', 'creative', 'custom'];
    const iconOptions = ['📋', '✏️', '💻', '📊', '🎨', '🔧', '📝', '💡', '🚀', '⭐'];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[700px] md:max-h-[600px] bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                📋 Chat Templates
                            </h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="text-[#8b949e] hover:text-white"
                            >
                                <X size={20} />
                            </Button>
                        </div>

                        {/* Search and Filter */}
                        <div className="px-4 py-3 border-b border-[#30363d] space-y-3">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search templates..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-[#8b949e] focus:outline-none focus:border-orange-500/50"
                                />
                            </div>

                            {/* Category Filter */}
                            <div className="flex gap-2 flex-wrap">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedCategory === cat
                                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                                : 'bg-[#21262d] text-[#8b949e] border border-transparent hover:text-white'
                                            }`}
                                    >
                                        {cat === 'all' ? '🏠 All' : `${categoryInfo[cat].icon} ${categoryInfo[cat].label}`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {/* Create/Edit Form */}
                            {(isCreating || editingId) && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-4 p-4 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-3"
                                >
                                    <h3 className="text-sm font-medium text-white">
                                        {editingId ? 'Edit Template' : 'Create New Template'}
                                    </h3>

                                    <div className="flex gap-2">
                                        {/* Icon Picker */}
                                        <div className="relative group">
                                            <button className="w-10 h-10 bg-[#21262d] rounded-lg border border-[#30363d] text-lg flex items-center justify-center">
                                                {formIcon}
                                            </button>
                                            <div className="absolute top-full left-0 mt-1 p-2 bg-[#21262d] rounded-lg border border-[#30363d] hidden group-hover:grid grid-cols-5 gap-1 z-10">
                                                {iconOptions.map((icon) => (
                                                    <button
                                                        key={icon}
                                                        onClick={() => setFormIcon(icon)}
                                                        className="w-8 h-8 rounded hover:bg-[#30363d] flex items-center justify-center"
                                                    >
                                                        {icon}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Name */}
                                        <input
                                            type="text"
                                            placeholder="Template name"
                                            value={formName}
                                            onChange={(e) => setFormName(e.target.value)}
                                            className="flex-1 bg-[#21262d] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#8b949e] focus:outline-none focus:border-orange-500/50"
                                        />
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Description (optional)"
                                        value={formDescription}
                                        onChange={(e) => setFormDescription(e.target.value)}
                                        className="w-full bg-[#21262d] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#8b949e] focus:outline-none focus:border-orange-500/50"
                                    />

                                    <textarea
                                        placeholder="Prompt template..."
                                        value={formPrompt}
                                        onChange={(e) => setFormPrompt(e.target.value)}
                                        rows={3}
                                        className="w-full bg-[#21262d] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#8b949e] focus:outline-none focus:border-orange-500/50 resize-none"
                                    />

                                    {/* Category Selector */}
                                    <div className="relative">
                                        <select
                                            value={formCategory}
                                            onChange={(e) => setFormCategory(e.target.value as TemplateCategory)}
                                            className="w-full bg-[#21262d] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:border-orange-500/50"
                                        >
                                            {Object.entries(categoryInfo).map(([key, { label, icon }]) => (
                                                <option key={key} value={key}>
                                                    {icon} {label}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e]" size={16} />
                                    </div>

                                    <div className="flex gap-2 justify-end">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                resetForm();
                                                setIsCreating(false);
                                                setEditingId(null);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={editingId ? handleSaveEdit : handleCreateTemplate}
                                            disabled={!formName.trim() || !formPrompt.trim()}
                                            className="bg-orange-500 hover:bg-orange-600 text-white"
                                        >
                                            <Check size={16} className="mr-1" />
                                            {editingId ? 'Save' : 'Create'}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Templates List */}
                            {Object.keys(groupedTemplates).length === 0 ? (
                                <div className="text-center py-8 text-[#8b949e]">
                                    <p>No templates found</p>
                                    <p className="text-sm mt-1">Try a different search or category</p>
                                </div>
                            ) : (
                                Object.entries(groupedTemplates).map(([category, templates]) => (
                                    <div key={category} className="mb-4">
                                        <h3 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-2 flex items-center gap-2">
                                            {categoryInfo[category as TemplateCategory]?.icon || '📋'}
                                            {categoryInfo[category as TemplateCategory]?.label || category}
                                        </h3>
                                        <div className="grid gap-2">
                                            {templates.map((template) => (
                                                <motion.button
                                                    key={template.id}
                                                    whileHover={{ scale: 1.01 }}
                                                    whileTap={{ scale: 0.99 }}
                                                    onClick={() => handleSelectTemplate(template)}
                                                    className="w-full p-3 bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] rounded-lg text-left transition-colors group"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <span className="text-xl">{template.icon}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-white">{template.name}</span>
                                                                {template.isBuiltIn && (
                                                                    <span className="px-1.5 py-0.5 text-[10px] bg-[#21262d] text-[#8b949e] rounded">
                                                                        Built-in
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-[#8b949e] truncate">{template.description}</p>
                                                        </div>
                                                        {!template.isBuiltIn && (
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleEditTemplate(template);
                                                                    }}
                                                                    className="p-1.5 hover:bg-[#30363d] rounded text-[#8b949e] hover:text-white"
                                                                >
                                                                    <Edit3 size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteTemplate(template.id);
                                                                    }}
                                                                    className="p-1.5 hover:bg-red-500/20 rounded text-[#8b949e] hover:text-red-400"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-3 border-t border-[#30363d] flex justify-between items-center">
                            <span className="text-xs text-[#8b949e]">
                                {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
                            </span>
                            {!isCreating && !editingId && (
                                <Button
                                    size="sm"
                                    onClick={startCreating}
                                    className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400"
                                >
                                    <Plus size={16} className="mr-1" />
                                    New Template
                                </Button>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
