/**
 * Chat API Client for MIRA
 * Handles communication with MongoDB backend via Vercel serverless functions
 */

import type { StoredMessage, ChatSession } from './chatStorage';

const API_BASE = '/api/db';

// Helper for API calls with error handling
async function apiCall<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE}${endpoint}`;

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || `API error: ${response.status}`);
        }

        return response.json();
    } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
            // Network error - likely offline
            throw new Error('NETWORK_ERROR');
        }
        throw error;
    }
}

// ============ Session API ============

export interface SessionListResponse {
    sessions: DbSession[];
    total: number;
    limit: number;
    offset: number;
}

export interface DbSession {
    _id?: string;
    sessionId: string;
    title: string;
    model: string;
    createdAt: string;
    updatedAt: string;
    userId?: string;
}

/**
 * Fetch all sessions from MongoDB
 */
export async function fetchSessions(limit = 50, offset = 0): Promise<SessionListResponse> {
    return apiCall<SessionListResponse>(`/sessions?limit=${limit}&offset=${offset}`);
}

/**
 * Fetch single session by ID
 */
export async function fetchSession(sessionId: string): Promise<DbSession> {
    return apiCall<DbSession>(`/sessions?id=${sessionId}`);
}

/**
 * Create a new session in MongoDB
 */
export async function createSession(session: {
    sessionId: string;
    title: string;
    model: string;
    userId?: string;
}): Promise<DbSession> {
    return apiCall<DbSession>('/sessions', {
        method: 'POST',
        body: JSON.stringify(session),
    });
}

/**
 * Update session in MongoDB
 */
export async function updateSession(
    sessionId: string,
    updates: { title?: string; model?: string }
): Promise<{ success: boolean }> {
    return apiCall<{ success: boolean }>('/sessions', {
        method: 'PUT',
        body: JSON.stringify({ sessionId, ...updates }),
    });
}

/**
 * Delete session from MongoDB (also deletes messages)
 */
export async function deleteSession(sessionId: string): Promise<{ success: boolean }> {
    return apiCall<{ success: boolean }>(`/sessions?id=${sessionId}`, {
        method: 'DELETE',
    });
}

// ============ Messages API ============

export interface MessageListResponse {
    messages: DbMessage[];
    total: number;
    limit: number;
    offset: number;
}

export interface DbMessage {
    _id?: string;
    messageId: string;
    sessionId: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

/**
 * Fetch messages for a session
 */
export async function fetchMessages(
    sessionId: string,
    limit = 50,
    offset = 0
): Promise<MessageListResponse> {
    return apiCall<MessageListResponse>(
        `/messages?sessionId=${sessionId}&limit=${limit}&offset=${offset}`
    );
}

/**
 * Add a message to a session
 */
export async function addMessage(message: {
    sessionId: string;
    messageId: string;
    role: 'user' | 'assistant';
    content: string;
}): Promise<DbMessage> {
    return apiCall<DbMessage>('/messages', {
        method: 'POST',
        body: JSON.stringify(message),
    });
}

/**
 * Batch add messages to a session
 */
export async function addMessages(
    sessionId: string,
    messages: StoredMessage[]
): Promise<{ success: boolean; count: number }> {
    return apiCall<{ success: boolean; count: number }>('/messages', {
        method: 'POST',
        body: JSON.stringify({
            sessionId,
            messages: messages.map(m => ({
                messageId: m.id,
                sessionId,
                role: m.role,
                content: m.content,
                timestamp: m.timestamp,
            })),
        }),
    });
}

/**
 * Update a message
 */
export async function updateMessage(
    messageId: string,
    content: string
): Promise<{ success: boolean }> {
    return apiCall<{ success: boolean }>('/messages', {
        method: 'PUT',
        body: JSON.stringify({ messageId, content }),
    });
}

/**
 * Delete messages from a specific message onwards (for edit/truncate)
 */
export async function deleteMessagesFrom(
    sessionId: string,
    fromMessageId: string
): Promise<{ success: boolean }> {
    return apiCall<{ success: boolean }>(
        `/messages?sessionId=${sessionId}&fromMessageId=${fromMessageId}`,
        { method: 'DELETE' }
    );
}

// ============ Sync Utilities ============

/**
 * Convert DbSession to ChatSession format
 */
export function dbSessionToChatSession(dbSession: DbSession, messages: StoredMessage[] = []): ChatSession {
    return {
        id: dbSession.sessionId,
        title: dbSession.title,
        model: dbSession.model,
        messages,
        createdAt: new Date(dbSession.createdAt).getTime(),
        updatedAt: new Date(dbSession.updatedAt).getTime(),
    };
}

/**
 * Convert DbMessage to StoredMessage format
 */
export function dbMessageToStoredMessage(dbMessage: DbMessage): StoredMessage {
    return {
        id: dbMessage.messageId,
        role: dbMessage.role,
        content: dbMessage.content,
        timestamp: new Date(dbMessage.timestamp).getTime(),
    };
}

/**
 * Check if we're online
 */
export function isOnline(): boolean {
    return navigator.onLine;
}

/**
 * Check if API is available (quick health check)
 */
export async function checkApiHealth(): Promise<boolean> {
    try {
        await fetchSessions(1, 0);
        return true;
    } catch {
        return false;
    }
}
