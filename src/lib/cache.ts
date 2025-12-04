/**
 * Response Caching Module for MIRA
 * Provides caching for RAG responses and API calls
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

export interface CacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  persistToStorage: boolean;
}

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 100,
  ttl: 1000 * 60 * 60, // 1 hour
  persistToStorage: true,
};

const STORAGE_KEY = 'mira-response-cache';

/**
 * LRU Cache implementation with TTL support
 */
export class ResponseCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
  }

  /**
   * Normalize query for consistent cache keys
   */
  private normalizeKey(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[?!.,;:'"]/g, '');
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > this.config.ttl;
  }

  /**
   * Get item from cache
   */
  get(query: string): T | null {
    const key = this.normalizeKey(query);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }

    // Update hit count and move to end (LRU)
    entry.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    console.log(`📦 Cache hit for: "${query.substring(0, 50)}..." (hits: ${entry.hits})`);
    return entry.data;
  }

  /**
   * Set item in cache
   */
  set(query: string, data: T): void {
    const key = this.normalizeKey(query);

    // Evict oldest entries if at capacity
    if (this.cache.size >= this.config.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 1,
    });

    console.log(`💾 Cached response for: "${query.substring(0, 50)}..."`);
    this.saveToStorage();
  }

  /**
   * Check if query has cached response
   */
  has(query: string): boolean {
    const key = this.normalizeKey(query);
    const entry = this.cache.get(key);

    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    if (this.config.persistToStorage) {
      localStorage.removeItem(STORAGE_KEY);
    }
    console.log('🗑️ Cache cleared');
  }

  /**
   * Remove expired entries
   */
  cleanup(): number {
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      this.saveToStorage();
      console.log(`🧹 Cleaned up ${removed} expired cache entries`);
    }
    return removed;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate: number } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0,
    };
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    if (!this.config.persistToStorage) return;

    try {
      const entries = Array.from(this.cache.entries());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.warn('Failed to save cache to storage:', e);
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    if (!this.config.persistToStorage) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const entries: [string, CacheEntry<T>][] = JSON.parse(stored);
        for (const [key, entry] of entries) {
          if (!this.isExpired(entry)) {
            this.cache.set(key, entry);
          }
        }
        console.log(`📥 Loaded ${this.cache.size} cached responses from storage`);
      }
    } catch (e) {
      console.warn('Failed to load cache from storage:', e);
    }
  }
}

/**
 * Conversation History Manager
 * Manages multi-turn conversation context
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: number;
  updatedAt: number;
  model: string;
}

const CONVERSATIONS_STORAGE_KEY = 'mira-conversations';
const MAX_CONVERSATIONS = 50;
const MAX_CONTEXT_MESSAGES = 10; // Maximum messages to send for context

export class ConversationManager {
  private conversations: Map<string, Conversation> = new Map();
  private currentId: string | null = null;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Create a new conversation
   */
  create(model: string = 'gemini-2.0-flash'): string {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const conversation: Conversation = {
      id,
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model,
    };

    this.conversations.set(id, conversation);
    this.currentId = id;
    this.enforceLimit();
    this.saveToStorage();

    console.log(`📝 Created new conversation: ${id}`);
    return id;
  }

  /**
   * Get current conversation ID (creates one if none exists)
   */
  getCurrentId(): string {
    if (!this.currentId) {
      return this.create();
    }
    return this.currentId;
  }

  /**
   * Set current conversation
   */
  setCurrent(id: string): boolean {
    if (this.conversations.has(id)) {
      this.currentId = id;
      return true;
    }
    return false;
  }

  /**
   * Get conversation by ID
   */
  get(id: string): Conversation | null {
    return this.conversations.get(id) || null;
  }

  /**
   * Get current conversation
   */
  getCurrent(): Conversation | null {
    if (!this.currentId) return null;
    return this.get(this.currentId);
  }

  /**
   * Add message to conversation
   */
  addMessage(role: 'user' | 'assistant', content: string, conversationId?: string): void {
    const id = conversationId || this.getCurrentId();
    const conversation = this.conversations.get(id);

    if (!conversation) {
      console.warn(`Conversation ${id} not found`);
      return;
    }

    conversation.messages.push({
      role,
      content,
      timestamp: Date.now(),
    });

    conversation.updatedAt = Date.now();

    // Auto-generate title from first user message
    if (conversation.messages.length === 1 && role === 'user') {
      conversation.title = this.generateTitle(content);
    }

    this.saveToStorage();
  }

  /**
   * Generate conversation title from first message
   */
  private generateTitle(message: string): string {
    // Take first 50 characters or first sentence
    let title = message.split(/[.!?។]/)[0].trim();
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }
    return title || 'New Conversation';
  }

  /**
   * Get messages formatted for API context
   * Returns last N messages for context window
   */
  getContextMessages(conversationId?: string): Array<{ role: 'user' | 'model'; content: string }> {
    const id = conversationId || this.currentId;
    if (!id) return [];

    const conversation = this.conversations.get(id);
    if (!conversation) return [];

    // Get last N messages for context
    const contextMessages = conversation.messages
      .slice(-MAX_CONTEXT_MESSAGES)
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
        content: msg.content,
      }));

    return contextMessages;
  }

  /**
   * Get all conversations (sorted by most recent)
   */
  getAll(): Conversation[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Delete a conversation
   */
  delete(id: string): boolean {
    const deleted = this.conversations.delete(id);
    if (deleted) {
      if (this.currentId === id) {
        this.currentId = null;
      }
      this.saveToStorage();
      console.log(`🗑️ Deleted conversation: ${id}`);
    }
    return deleted;
  }

  /**
   * Clear current conversation
   */
  clearCurrent(): void {
    if (this.currentId) {
      this.delete(this.currentId);
    }
    this.currentId = null;
  }

  /**
   * Enforce maximum conversation limit
   */
  private enforceLimit(): void {
    const all = this.getAll();
    if (all.length > MAX_CONVERSATIONS) {
      const toRemove = all.slice(MAX_CONVERSATIONS);
      for (const conv of toRemove) {
        this.conversations.delete(conv.id);
      }
    }
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        conversations: Array.from(this.conversations.entries()),
        currentId: this.currentId,
      };
      localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save conversations:', e);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.conversations = new Map(data.conversations || []);
        this.currentId = data.currentId || null;
        console.log(`📥 Loaded ${this.conversations.size} conversations from storage`);
      }
    } catch (e) {
      console.warn('Failed to load conversations:', e);
    }
  }
}

// Singleton instances
export const responseCache = new ResponseCache<string>({
  maxSize: 100,
  ttl: 1000 * 60 * 60, // 1 hour
  persistToStorage: true,
});

export const conversationManager = new ConversationManager();

// Cleanup expired cache entries periodically
setInterval(() => {
  responseCache.cleanup();
}, 1000 * 60 * 5); // Every 5 minutes
