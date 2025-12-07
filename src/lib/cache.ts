/**
 * Response Caching Module for MIRA
 * Provides caching for RAG responses and API calls
 * Enhanced with semantic similarity, frequency tracking, and cache warming
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
  originalQuery: string; // Store original query for similarity matching
}

export interface CacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  persistToStorage: boolean;
  similarityThreshold: number; // Minimum similarity for fuzzy matching (0-1)
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  similarityHits: number;
  topQueries: Array<{ query: string; hits: number }>;
}

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 100,
  ttl: 1000 * 60 * 60, // 1 hour
  persistToStorage: true,
  similarityThreshold: 0.85, // 85% similarity for fuzzy matching
};

const STORAGE_KEY = 'mira-response-cache';
const FREQUENCY_STORAGE_KEY = 'mira-query-frequency';

// Common queries to warm cache with
const COMMON_QUERIES = [
  'ආයුබෝවන්',
  'ඔබ කවුද',
  'ඔබේ නම මොකක්ද',
  'help',
  'උදව් කරන්න',
  'hello',
  'hi',
  'thank you',
  'ස්තූතියි',
];

/**
 * Calculate similarity between two strings (Levenshtein-based)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Quick check: if length difference is too large, skip expensive calculation
  const lengthRatio = Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
  if (lengthRatio < 0.5) return lengthRatio;

  // Levenshtein distance calculation
  const matrix: number[][] = [];

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[s1.length][s2.length];
  const maxLength = Math.max(s1.length, s2.length);

  return 1 - distance / maxLength;
}

/**
 * LRU Cache implementation with TTL, semantic similarity, and frequency tracking
 */
export class ResponseCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private queryFrequency: Map<string, number> = new Map();
  private config: CacheConfig;
  private totalHits = 0;
  private totalMisses = 0;
  private similarityHits = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
    this.loadFrequencyData();
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
   * Track query frequency
   */
  private trackQuery(query: string): void {
    const key = this.normalizeKey(query);
    const current = this.queryFrequency.get(key) || 0;
    this.queryFrequency.set(key, current + 1);
    this.saveFrequencyData();
  }

  /**
   * Get item from cache (exact match)
   */
  get(query: string): T | null {
    this.trackQuery(query);
    const key = this.normalizeKey(query);
    const entry = this.cache.get(key);

    if (!entry) {
      this.totalMisses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.saveToStorage();
      this.totalMisses++;
      return null;
    }

    // Update hit count and move to end (LRU)
    entry.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.totalHits++;

    console.log(`📦 Cache hit for: "${query.substring(0, 50)}..." (hits: ${entry.hits})`);
    return entry.data;
  }

  /**
   * Get similar item from cache using fuzzy matching
   */
  getSimilar(query: string): { data: T; similarity: number; matchedQuery: string } | null {
    this.trackQuery(query);
    const normalizedQuery = this.normalizeKey(query);

    let bestMatch: { key: string; entry: CacheEntry<T>; similarity: number } | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) continue;

      const similarity = calculateSimilarity(normalizedQuery, key);

      if (similarity >= this.config.similarityThreshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { key, entry, similarity };
        }
      }
    }

    if (bestMatch) {
      // Update hit count
      bestMatch.entry.hits++;
      this.cache.delete(bestMatch.key);
      this.cache.set(bestMatch.key, bestMatch.entry);
      this.totalHits++;
      this.similarityHits++;

      console.log(
        `🔍 Similar cache hit (${(bestMatch.similarity * 100).toFixed(1)}%): ` +
        `"${query.substring(0, 30)}..." ≈ "${bestMatch.entry.originalQuery.substring(0, 30)}..."`
      );

      return {
        data: bestMatch.entry.data,
        similarity: bestMatch.similarity,
        matchedQuery: bestMatch.entry.originalQuery,
      };
    }

    this.totalMisses++;
    return null;
  }

  /**
   * Get with fallback to similar match
   */
  getOrSimilar(query: string): T | null {
    // Try exact match first
    const exact = this.get(query);
    if (exact !== null) return exact;

    // Try similar match
    const similar = this.getSimilar(query);
    if (similar) return similar.data;

    return null;
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
      originalQuery: query,
    });

    console.log(`💾 Cached response for: "${query.substring(0, 50)}..."`);
    this.saveToStorage();
  }

  /**
   * Check if query has cached response (exact or similar)
   */
  has(query: string): boolean {
    const key = this.normalizeKey(query);
    const entry = this.cache.get(key);

    if (!entry) {
      // Check for similar
      for (const [cachedKey, cachedEntry] of this.cache.entries()) {
        if (this.isExpired(cachedEntry)) continue;
        if (calculateSimilarity(key, cachedKey) >= this.config.similarityThreshold) {
          return true;
        }
      }
      return false;
    }

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
    this.totalHits = 0;
    this.totalMisses = 0;
    this.similarityHits = 0;
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
   * Get most frequently asked queries
   */
  getTopQueries(limit: number = 10): Array<{ query: string; count: number }> {
    const sorted = Array.from(this.queryFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    return sorted.map(([query, count]) => ({ query, count }));
  }

  /**
   * Warm cache with common queries (to be called with fetch function)
   */
  async warmCache(
    fetchFunction: (query: string) => Promise<T>,
    queries: string[] = COMMON_QUERIES
  ): Promise<number> {
    let warmed = 0;

    console.log('🔥 Warming cache with common queries...');

    for (const query of queries) {
      if (this.has(query)) {
        continue; // Already cached
      }

      try {
        const response = await fetchFunction(query);
        this.set(query, response);
        warmed++;
      } catch (error) {
        console.warn(`⚠️ Failed to warm cache for: "${query}"`, error);
      }
    }

    console.log(`🔥 Cache warmed with ${warmed} new entries`);
    return warmed;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let totalEntryHits = 0;
    for (const entry of this.cache.values()) {
      totalEntryHits += entry.hits;
    }

    const topQueries = this.getTopQueries(5).map(q => ({
      query: q.query,
      hits: q.count,
    }));

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: this.totalHits + this.totalMisses > 0
        ? this.totalHits / (this.totalHits + this.totalMisses)
        : 0,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      similarityHits: this.similarityHits,
      topQueries,
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

  /**
   * Save frequency data to localStorage
   */
  private saveFrequencyData(): void {
    if (!this.config.persistToStorage) return;

    try {
      const entries = Array.from(this.queryFrequency.entries());
      localStorage.setItem(FREQUENCY_STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.warn('Failed to save frequency data:', e);
    }
  }

  /**
   * Load frequency data from localStorage
   */
  private loadFrequencyData(): void {
    if (!this.config.persistToStorage) return;

    try {
      const stored = localStorage.getItem(FREQUENCY_STORAGE_KEY);
      if (stored) {
        const entries: [string, number][] = JSON.parse(stored);
        this.queryFrequency = new Map(entries);
        console.log(`📊 Loaded frequency data for ${this.queryFrequency.size} queries`);
      }
    } catch (e) {
      console.warn('Failed to load frequency data:', e);
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
