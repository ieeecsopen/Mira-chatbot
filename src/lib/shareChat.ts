/**
 * Chat Sharing Module for MIRA
 * Handles creating and retrieving shared chat links
 */

import type { ChatSession, StoredMessage } from './chatStorage';

export interface SharedChat {
    id: string;
    title: string;
    messages: StoredMessage[];
    sharedAt: number;
    expiresAt: number | null; // null = never expires
    viewCount: number;
}

const SHARED_CHATS_KEY = 'mira-shared-chats';
const DEFAULT_EXPIRY_DAYS = 30;

/**
 * Generate a short, URL-friendly share ID
 */
function generateShareId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 8; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

/**
 * Get all shared chats from storage
 */
function getSharedChats(): Map<string, SharedChat> {
    try {
        const stored = localStorage.getItem(SHARED_CHATS_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            return new Map(data);
        }
    } catch (e) {
        console.warn('Failed to load shared chats:', e);
    }
    return new Map();
}

/**
 * Save shared chats to storage
 */
function saveSharedChats(chats: Map<string, SharedChat>): void {
    try {
        localStorage.setItem(SHARED_CHATS_KEY, JSON.stringify(Array.from(chats.entries())));
    } catch (e) {
        console.warn('Failed to save shared chats:', e);
    }
}

/**
 * Create a shareable link for a chat session
 */
export function shareChat(session: ChatSession, expiresInDays: number | null = DEFAULT_EXPIRY_DAYS): string {
    const chats = getSharedChats();

    // Check if this session was already shared
    for (const [id, chat] of chats.entries()) {
        if (chat.messages.length === session.messages.length &&
            chat.messages[0]?.id === session.messages[0]?.id) {
            // Return existing share link
            return id;
        }
    }

    const shareId = generateShareId();
    const sharedChat: SharedChat = {
        id: shareId,
        title: session.title,
        messages: session.messages,
        sharedAt: Date.now(),
        expiresAt: expiresInDays ? Date.now() + (expiresInDays * 24 * 60 * 60 * 1000) : null,
        viewCount: 0,
    };

    chats.set(shareId, sharedChat);
    saveSharedChats(chats);

    console.log(`📤 Created share link: ${shareId}`);
    return shareId;
}

/**
 * Get a shared chat by ID
 */
export function getSharedChat(shareId: string): SharedChat | null {
    const chats = getSharedChats();
    const chat = chats.get(shareId);

    if (!chat) return null;

    // Check if expired
    if (chat.expiresAt && Date.now() > chat.expiresAt) {
        chats.delete(shareId);
        saveSharedChats(chats);
        return null;
    }

    // Increment view count
    chat.viewCount++;
    saveSharedChats(chats);

    return chat;
}

/**
 * Delete a shared chat
 */
export function deleteSharedChat(shareId: string): boolean {
    const chats = getSharedChats();
    const deleted = chats.delete(shareId);
    if (deleted) {
        saveSharedChats(chats);
    }
    return deleted;
}

/**
 * Get the full share URL for a chat
 */
export function getShareUrl(shareId: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}?share=${shareId}`;
}

/**
 * Check if current URL has a share parameter
 */
export function getShareIdFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('share');
}

/**
 * Clean up expired shared chats
 */
export function cleanupExpiredChats(): void {
    const chats = getSharedChats();
    const now = Date.now();
    let removed = 0;

    for (const [id, chat] of chats.entries()) {
        if (chat.expiresAt && now > chat.expiresAt) {
            chats.delete(id);
            removed++;
        }
    }

    if (removed > 0) {
        saveSharedChats(chats);
        console.log(`🧹 Cleaned up ${removed} expired shared chats`);
    }
}
