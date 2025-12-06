/**
 * Chat Storage Module for MIRA
 * Provides localStorage persistence for chat sessions
 */

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: StoredMessage[];
  model: string;
  createdAt: number;
  updatedAt: number;
}

const CHATS_STORAGE_KEY = 'mira-chat-sessions';
const CURRENT_CHAT_KEY = 'mira-current-chat-id';
const MAX_SESSIONS = 50;

/**
 * Chat Storage Manager
 * Handles persistence of chat sessions to localStorage
 */
class ChatStorageManager {
  private sessions: Map<string, ChatSession> = new Map();
  private currentSessionId: string | null = null;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Generate a unique session ID
   */
  private generateId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate title from first message
   */
  private generateTitle(message: string): string {
    // Take first 40 characters or first sentence
    let title = message.split(/[.!?။\n]/)[0].trim();
    if (title.length > 40) {
      title = title.substring(0, 37) + '...';
    }
    return title || 'New Chat';
  }

  /**
   * Create a new chat session
   */
  createSession(model: string = 'gemini-2.0-flash'): string {
    const id = this.generateId();
    const session: ChatSession = {
      id,
      title: 'New Chat',
      messages: [],
      model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.sessions.set(id, session);
    this.currentSessionId = id;
    this.enforceLimit();
    this.saveToStorage();

    console.log(`📝 Created new chat session: ${id}`);
    return id;
  }

  /**
   * Get or create current session
   */
  getCurrentSessionId(): string {
    if (!this.currentSessionId || !this.sessions.has(this.currentSessionId)) {
      return this.createSession();
    }
    return this.currentSessionId;
  }

  /**
   * Set current session
   */
  setCurrentSession(id: string): boolean {
    if (this.sessions.has(id)) {
      this.currentSessionId = id;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Get a session by ID
   */
  getSession(id: string): ChatSession | null {
    return this.sessions.get(id) || null;
  }

  /**
   * Get current session
   */
  getCurrentSession(): ChatSession | null {
    if (!this.currentSessionId) return null;
    return this.getSession(this.currentSessionId);
  }

  /**
   * Get messages from current session
   */
  getCurrentMessages(): StoredMessage[] {
    const session = this.getCurrentSession();
    return session?.messages || [];
  }

  /**
   * Add a message to the current session
   */
  addMessage(role: 'user' | 'assistant', content: string): void {
    const sessionId = this.getCurrentSessionId();
    const session = this.sessions.get(sessionId);

    if (!session) return;

    const message: StoredMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      role,
      content,
      timestamp: Date.now(),
    };

    session.messages.push(message);
    session.updatedAt = Date.now();

    // Auto-generate title from first user message
    if (session.messages.filter(m => m.role === 'user').length === 1 && role === 'user') {
      session.title = this.generateTitle(content);
    }

    this.saveToStorage();
  }

  /**
   * Update the last assistant message (for streaming)
   */
  updateLastAssistantMessage(content: string): void {
    const session = this.getCurrentSession();
    if (!session) return;

    const lastMessage = session.messages[session.messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      lastMessage.content = content;
      session.updatedAt = Date.now();
      // Don't save during streaming to avoid performance issues
      // Will be saved when streaming completes
    }
  }

  /**
   * Get a slice of messages for pagination
   * @param len - Number of messages to return (default 20)
   * @param offset - Number of messages to skip from the end (default 0)
   */
  getMessages(sessionId: string, limit: number = 20, offset: number = 0): StoredMessage[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    const totalMessages = session.messages.length;

    // Calculate start and end indices from the end of the array
    const end = totalMessages - offset;
    const start = Math.max(0, end - limit);

    // Return the slice
    return session.messages.slice(start, end);
  }

  /**
   * Truncate messages from a specific message ID (inclusive)
   * Used for editing previous messages
   */
  truncateFromMessage(sessionId: string, messageId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const index = session.messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      session.messages = session.messages.slice(0, index);
      session.updatedAt = Date.now();
      this.saveToStorage();
    }
  }

  /**
   * Edit a user message and drop all subsequent messages so the chat can be replayed.
   * Returns true if the edit was applied.
   */
  editMessageAndTruncate(messageId: string, newContent: string): boolean {
    const session = this.getCurrentSession();
    if (!session) return false;

    const index = session.messages.findIndex(m => m.id === messageId);
    if (index === -1) return false;

    if (session.messages[index].role !== 'user') return false;

    session.messages[index] = {
      ...session.messages[index],
      content: newContent,
      timestamp: Date.now(),
    };

    session.messages = session.messages.slice(0, index + 1);
    session.updatedAt = Date.now();
    this.saveToStorage();
    return true;
  }

  /**
   * Save current session state (call after streaming completes)
   */
  saveCurrentSession(): void {
    this.saveToStorage();
  }

  /**
   * Get all sessions sorted by most recent
   */
  getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Get recent sessions for sidebar
   */
  getRecentSessions(limit: number = 10): ChatSession[] {
    return this.getAllSessions().slice(0, limit);
  }

  /**
   * Delete a session
   */
  deleteSession(id: string): boolean {
    const deleted = this.sessions.delete(id);
    if (deleted) {
      if (this.currentSessionId === id) {
        this.currentSessionId = null;
      }
      this.saveToStorage();
      console.log(`🗑️ Deleted chat session: ${id}`);
    }
    return deleted;
  }

  /**
   * Clear current session and start fresh
   */
  clearCurrentSession(): void {
    if (this.currentSessionId) {
      this.deleteSession(this.currentSessionId);
    }
    this.currentSessionId = null;
  }

  /**
   * Enforce maximum session limit
   */
  private enforceLimit(): void {
    const all = this.getAllSessions();
    if (all.length > MAX_SESSIONS) {
      const toRemove = all.slice(MAX_SESSIONS);
      for (const session of toRemove) {
        this.sessions.delete(session.id);
      }
    }
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        sessions: Array.from(this.sessions.entries()),
        currentSessionId: this.currentSessionId,
      };
      localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(CURRENT_CHAT_KEY, this.currentSessionId || '');
    } catch (e) {
      console.warn('Failed to save chat sessions:', e);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(CHATS_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.sessions = new Map(data.sessions || []);
        this.currentSessionId = data.currentSessionId || null;
        console.log(`📥 Loaded ${this.sessions.size} chat sessions from storage`);
      }
    } catch (e) {
      console.warn('Failed to load chat sessions:', e);
    }
  }

  /**
   * Export all sessions (for backup)
   */
  exportSessions(): string {
    return JSON.stringify(Array.from(this.sessions.values()), null, 2);
  }

  /**
   * Clear all sessions
   */
  clearAll(): void {
    this.sessions.clear();
    this.currentSessionId = null;
    localStorage.removeItem(CHATS_STORAGE_KEY);
    localStorage.removeItem(CURRENT_CHAT_KEY);
    console.log('🗑️ Cleared all chat sessions');
  }
}

// Singleton instance
export const chatStorage = new ChatStorageManager();
