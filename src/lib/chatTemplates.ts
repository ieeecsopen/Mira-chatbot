/**
 * Chat Templates Module for MIRA
 * Provides reusable prompt templates for common tasks
 */

const TEMPLATES_STORAGE_KEY = 'mira-chat-templates';

export type TemplateCategory = 'writing' | 'coding' | 'analysis' | 'creative' | 'custom';

export interface ChatTemplate {
    id: string;
    name: string;
    description: string;
    prompt: string;
    icon: string;
    isBuiltIn: boolean;
    category: TemplateCategory;
    createdAt: number;
}

// Built-in templates
const builtInTemplates: ChatTemplate[] = [
    // Writing
    {
        id: 'summarize',
        name: 'Summarize',
        description: 'Summarize text or articles',
        prompt: 'Please summarize the following text in a clear and concise manner:\n\n',
        icon: '📝',
        isBuiltIn: true,
        category: 'writing',
        createdAt: 0,
    },
    {
        id: 'translate',
        name: 'Translate',
        description: 'Translate text to another language',
        prompt: 'Please translate the following text to [TARGET LANGUAGE]:\n\n',
        icon: '🌐',
        isBuiltIn: true,
        category: 'writing',
        createdAt: 0,
    },
    {
        id: 'proofread',
        name: 'Proofread',
        description: 'Check grammar and improve writing',
        prompt: 'Please proofread and improve the following text. Fix any grammar, spelling, or punctuation errors and suggest improvements:\n\n',
        icon: '✍️',
        isBuiltIn: true,
        category: 'writing',
        createdAt: 0,
    },
    {
        id: 'email',
        name: 'Write Email',
        description: 'Draft a professional email',
        prompt: 'Help me write a professional email about:\n\nTopic: ',
        icon: '📧',
        isBuiltIn: true,
        category: 'writing',
        createdAt: 0,
    },

    // Coding
    {
        id: 'code-review',
        name: 'Code Review',
        description: 'Review code for issues and improvements',
        prompt: 'Please review the following code. Check for bugs, security issues, performance problems, and suggest improvements:\n\n```\n',
        icon: '🔍',
        isBuiltIn: true,
        category: 'coding',
        createdAt: 0,
    },
    {
        id: 'explain-code',
        name: 'Explain Code',
        description: 'Explain how code works',
        prompt: 'Please explain how the following code works in detail:\n\n```\n',
        icon: '💡',
        isBuiltIn: true,
        category: 'coding',
        createdAt: 0,
    },
    {
        id: 'debug',
        name: 'Debug Error',
        description: 'Help fix a coding error',
        prompt: 'I\'m getting the following error. Please help me debug and fix it:\n\nError:\n',
        icon: '🐛',
        isBuiltIn: true,
        category: 'coding',
        createdAt: 0,
    },
    {
        id: 'write-tests',
        name: 'Write Tests',
        description: 'Generate unit tests for code',
        prompt: 'Please write comprehensive unit tests for the following code:\n\n```\n',
        icon: '🧪',
        isBuiltIn: true,
        category: 'coding',
        createdAt: 0,
    },

    // Analysis
    {
        id: 'analyze',
        name: 'Analyze',
        description: 'Analyze data or content',
        prompt: 'Please analyze the following and provide insights:\n\n',
        icon: '📊',
        isBuiltIn: true,
        category: 'analysis',
        createdAt: 0,
    },
    {
        id: 'compare',
        name: 'Compare',
        description: 'Compare two or more items',
        prompt: 'Please compare the following items, highlighting their differences and similarities:\n\n1. \n2. ',
        icon: '⚖️',
        isBuiltIn: true,
        category: 'analysis',
        createdAt: 0,
    },
    {
        id: 'pros-cons',
        name: 'Pros & Cons',
        description: 'List advantages and disadvantages',
        prompt: 'Please list the pros and cons of:\n\n',
        icon: '➕',
        isBuiltIn: true,
        category: 'analysis',
        createdAt: 0,
    },

    // Creative
    {
        id: 'brainstorm',
        name: 'Brainstorm',
        description: 'Generate creative ideas',
        prompt: 'Help me brainstorm ideas for:\n\n',
        icon: '💭',
        isBuiltIn: true,
        category: 'creative',
        createdAt: 0,
    },
    {
        id: 'story',
        name: 'Write Story',
        description: 'Create a creative story',
        prompt: 'Write a short creative story about:\n\n',
        icon: '📖',
        isBuiltIn: true,
        category: 'creative',
        createdAt: 0,
    },
    {
        id: 'poem',
        name: 'Write Poem',
        description: 'Compose a poem',
        prompt: 'Write a poem about:\n\n',
        icon: '🎭',
        isBuiltIn: true,
        category: 'creative',
        createdAt: 0,
    },
];

/**
 * Template Storage Manager
 */
class TemplateManager {
    private customTemplates: Map<string, ChatTemplate> = new Map();

    constructor() {
        this.loadFromStorage();
    }

    /**
     * Generate a unique template ID
     */
    private generateId(): string {
        return `template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Get all templates (built-in + custom)
     */
    getAllTemplates(): ChatTemplate[] {
        return [...builtInTemplates, ...Array.from(this.customTemplates.values())];
    }

    /**
     * Get templates by category
     */
    getTemplatesByCategory(category: TemplateCategory): ChatTemplate[] {
        return this.getAllTemplates().filter(t => t.category === category);
    }

    /**
     * Get a template by ID
     */
    getTemplate(id: string): ChatTemplate | null {
        const builtIn = builtInTemplates.find(t => t.id === id);
        if (builtIn) return builtIn;
        return this.customTemplates.get(id) || null;
    }

    /**
     * Create a new custom template
     */
    createTemplate(
        name: string,
        description: string,
        prompt: string,
        category: TemplateCategory = 'custom',
        icon: string = '📋'
    ): ChatTemplate {
        const template: ChatTemplate = {
            id: this.generateId(),
            name,
            description,
            prompt,
            icon,
            isBuiltIn: false,
            category,
            createdAt: Date.now(),
        };

        this.customTemplates.set(template.id, template);
        this.saveToStorage();

        console.log(`📋 Created new template: ${name}`);
        return template;
    }

    /**
     * Update a custom template
     */
    updateTemplate(
        id: string,
        updates: Partial<Pick<ChatTemplate, 'name' | 'description' | 'prompt' | 'icon' | 'category'>>
    ): ChatTemplate | null {
        const template = this.customTemplates.get(id);
        if (!template) {
            console.warn(`Cannot update built-in or non-existent template: ${id}`);
            return null;
        }

        const updated = { ...template, ...updates };
        this.customTemplates.set(id, updated);
        this.saveToStorage();

        return updated;
    }

    /**
     * Delete a custom template
     */
    deleteTemplate(id: string): boolean {
        if (builtInTemplates.find(t => t.id === id)) {
            console.warn('Cannot delete built-in templates');
            return false;
        }

        const deleted = this.customTemplates.delete(id);
        if (deleted) {
            this.saveToStorage();
            console.log(`🗑️ Deleted template: ${id}`);
        }
        return deleted;
    }

    /**
     * Search templates by name or description
     */
    searchTemplates(query: string): ChatTemplate[] {
        const lowerQuery = query.toLowerCase();
        return this.getAllTemplates().filter(
            t =>
                t.name.toLowerCase().includes(lowerQuery) ||
                t.description.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Save custom templates to localStorage
     */
    private saveToStorage(): void {
        try {
            const data = Array.from(this.customTemplates.entries());
            localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save templates:', e);
        }
    }

    /**
     * Load custom templates from localStorage
     */
    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                this.customTemplates = new Map(data);
                console.log(`📥 Loaded ${this.customTemplates.size} custom templates`);
            }
        } catch (e) {
            console.warn('Failed to load templates:', e);
        }
    }

    /**
     * Export all custom templates
     */
    exportTemplates(): string {
        return JSON.stringify(Array.from(this.customTemplates.values()), null, 2);
    }

    /**
     * Import templates from JSON
     */
    importTemplates(json: string): number {
        try {
            const templates: ChatTemplate[] = JSON.parse(json);
            let imported = 0;

            for (const template of templates) {
                if (!template.isBuiltIn) {
                    this.customTemplates.set(template.id, {
                        ...template,
                        isBuiltIn: false,
                    });
                    imported++;
                }
            }

            this.saveToStorage();
            return imported;
        } catch (e) {
            console.error('Failed to import templates:', e);
            return 0;
        }
    }
}

// Singleton instance
export const templateManager = new TemplateManager();

// Category metadata
export const categoryInfo: Record<TemplateCategory, { label: string; icon: string }> = {
    writing: { label: 'Writing', icon: '✏️' },
    coding: { label: 'Coding', icon: '💻' },
    analysis: { label: 'Analysis', icon: '📊' },
    creative: { label: 'Creative', icon: '🎨' },
    custom: { label: 'Custom', icon: '📋' },
};

export default templateManager;
