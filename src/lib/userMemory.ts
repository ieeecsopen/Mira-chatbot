/**
 * User Memory Storage for MIRA
 * Stores facts the AI learns about the user for personalized responses
 */

export interface MemoryItem {
    id: string;
    content: string;
    category: 'personal' | 'work' | 'preference' | 'context' | 'other';
    createdAt: number;
    source: 'auto' | 'manual'; // auto = AI extracted, manual = user added
}

const MEMORY_KEY = 'mira-user-memory';
const MAX_MEMORIES = 50;

/**
 * Get all memory items
 */
export function getAllMemories(): MemoryItem[] {
    try {
        const stored = localStorage.getItem(MEMORY_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Failed to load memories:', e);
    }
    return [];
}

/**
 * Save all memories
 */
function saveMemories(memories: MemoryItem[]): void {
    try {
        // Enforce limit
        const limited = memories.slice(0, MAX_MEMORIES);
        localStorage.setItem(MEMORY_KEY, JSON.stringify(limited));
    } catch (e) {
        console.warn('Failed to save memories:', e);
    }
}

/**
 * Add a new memory
 */
export function addMemory(
    content: string,
    category: MemoryItem['category'] = 'other',
    source: MemoryItem['source'] = 'manual'
): MemoryItem {
    const memories = getAllMemories();

    // Check for duplicates (case insensitive)
    const isDuplicate = memories.some(
        m => m.content.toLowerCase() === content.toLowerCase()
    );

    if (isDuplicate) {
        const existing = memories.find(
            m => m.content.toLowerCase() === content.toLowerCase()
        )!;
        return existing;
    }

    const memory: MemoryItem = {
        id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        content,
        category,
        createdAt: Date.now(),
        source,
    };

    memories.unshift(memory); // Add to front
    saveMemories(memories);

    console.log(`🧠 Added memory: "${content.substring(0, 50)}..."`);
    return memory;
}

/**
 * Remove a memory by ID
 */
export function removeMemory(id: string): boolean {
    const memories = getAllMemories();
    const filtered = memories.filter(m => m.id !== id);

    if (filtered.length < memories.length) {
        saveMemories(filtered);
        return true;
    }
    return false;
}

/**
 * Update a memory
 */
export function updateMemory(id: string, updates: Partial<Omit<MemoryItem, 'id' | 'createdAt'>>): boolean {
    const memories = getAllMemories();
    const index = memories.findIndex(m => m.id === id);

    if (index !== -1) {
        memories[index] = { ...memories[index], ...updates };
        saveMemories(memories);
        return true;
    }
    return false;
}

/**
 * Get memories by category
 */
export function getMemoriesByCategory(category: MemoryItem['category']): MemoryItem[] {
    return getAllMemories().filter(m => m.category === category);
}

/**
 * Clear all memories
 */
export function clearAllMemories(): void {
    localStorage.removeItem(MEMORY_KEY);
    console.log('🧠 Cleared all memories');
}

/**
 * Format memories for AI context injection
 */
export function getMemoryContext(): string {
    const memories = getAllMemories();

    if (memories.length === 0) {
        return '';
    }

    const grouped: Record<string, string[]> = {
        personal: [],
        work: [],
        preference: [],
        context: [],
        other: [],
    };

    memories.forEach(m => {
        grouped[m.category].push(m.content);
    });

    let context = '\n<user_memory>\nThings I know about this user:\n';

    if (grouped.personal.length > 0) {
        context += `\nPersonal: ${grouped.personal.join('; ')}`;
    }
    if (grouped.work.length > 0) {
        context += `\nWork/Professional: ${grouped.work.join('; ')}`;
    }
    if (grouped.preference.length > 0) {
        context += `\nPreferences: ${grouped.preference.join('; ')}`;
    }
    if (grouped.context.length > 0) {
        context += `\nContext: ${grouped.context.join('; ')}`;
    }
    if (grouped.other.length > 0) {
        context += `\nOther: ${grouped.other.join('; ')}`;
    }

    context += '\n</user_memory>\n';

    return context;
}

/**
 * Extract potential memories from assistant response
 * (Can be called after AI response to auto-extract learnings)
 */
export function extractMemoriesFromResponse(_content: string): void {
    // This is a placeholder - in a real implementation,
    // you could use AI to extract facts about the user
    // For now, memories are added manually or via slash command
}

/**
 * React hook for memories
 */
import { useState, useCallback, useEffect } from 'react';

export function useMemory() {
    const [memories, setMemoriesState] = useState<MemoryItem[]>(getAllMemories);

    // Reload on storage change
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === MEMORY_KEY) {
                setMemoriesState(getAllMemories());
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const add = useCallback((content: string, category: MemoryItem['category'] = 'other') => {
        const memory = addMemory(content, category, 'manual');
        setMemoriesState(getAllMemories());
        return memory;
    }, []);

    const remove = useCallback((id: string) => {
        removeMemory(id);
        setMemoriesState(getAllMemories());
    }, []);

    const clear = useCallback(() => {
        clearAllMemories();
        setMemoriesState([]);
    }, []);

    return { memories, add, remove, clear, getContext: getMemoryContext };
}
