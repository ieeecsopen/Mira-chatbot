/**
 * Canvas Collaboration Utilities
 * Provides export/import functionality for sharing canvas items
 * Foundation for future real-time collaboration features
 */

import type { CanvasItem } from './canvas';

export interface ExportedCanvasItem {
    version: number; // Schema version for forward compatibility
    item: CanvasItem;
    exportedAt: number;
    exportedBy?: string;
}

export interface CollabSession {
    id: string;
    itemId: string;
    participants: string[];
    createdAt: number;
    lastActivity: number;
}

const EXPORT_VERSION = 1;

/**
 * Generate session ID
 */
function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Export a canvas item to a shareable format (Base64 encoded JSON)
 */
export function exportCanvasItem(item: CanvasItem, exportedBy?: string): string {
    const exportData: ExportedCanvasItem = {
        version: EXPORT_VERSION,
        item: {
            ...item,
            // Generate new ID on import to avoid conflicts
            id: item.id,
        },
        exportedAt: Date.now(),
        exportedBy,
    };

    const json = JSON.stringify(exportData);
    // Use Base64 encoding for safe sharing
    return btoa(encodeURIComponent(json));
}

/**
 * Import a canvas item from exported format
 */
export function importCanvasItem(encoded: string): CanvasItem | null {
    try {
        const json = decodeURIComponent(atob(encoded));
        const data: ExportedCanvasItem = JSON.parse(json);

        // Version check for future compatibility
        if (data.version > EXPORT_VERSION) {
            console.warn('Import data is from a newer version, some features may not work');
        }

        // Generate new ID to avoid conflicts
        const newId = `canvas_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        return {
            ...data.item,
            id: newId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
    } catch (e) {
        console.error('Failed to import canvas item:', e);
        return null;
    }
}

/**
 * Validate exported data
 */
export function validateExportData(encoded: string): { valid: boolean; error?: string } {
    try {
        const json = decodeURIComponent(atob(encoded));
        const data = JSON.parse(json);

        if (!data.version || !data.item) {
            return { valid: false, error: 'Invalid export format' };
        }

        if (!data.item.content || !data.item.type) {
            return { valid: false, error: 'Missing required fields' };
        }

        return { valid: true };
    } catch {
        return { valid: false, error: 'Failed to parse export data' };
    }
}

/**
 * Create a collaboration session (foundation for future WebSocket support)
 */
export function createSession(itemId: string): CollabSession {
    const session: CollabSession = {
        id: generateSessionId(),
        itemId,
        participants: [],
        createdAt: Date.now(),
        lastActivity: Date.now(),
    };

    // Store session locally (future: sync to server)
    saveSession(session);

    return session;
}

/**
 * Generate a share link for a canvas item
 * Currently creates a data URL that can be shared
 */
export function generateShareLink(item: CanvasItem): string {
    const exported = exportCanvasItem(item);
    // Create a URL-safe format
    return `mira://canvas/import?data=${encodeURIComponent(exported)}`;
}

/**
 * Parse a share link and extract the canvas item
 */
export function parseShareLink(link: string): CanvasItem | null {
    try {
        const url = new URL(link);
        const data = url.searchParams.get('data');
        if (!data) return null;
        return importCanvasItem(decodeURIComponent(data));
    } catch {
        // Try direct import if not a valid URL
        return importCanvasItem(link);
    }
}

/**
 * Copy share link to clipboard
 */
export async function copyShareLink(item: CanvasItem): Promise<boolean> {
    try {
        const exported = exportCanvasItem(item);
        await navigator.clipboard.writeText(exported);
        return true;
    } catch (e) {
        console.error('Failed to copy share link:', e);
        return false;
    }
}

/**
 * Download canvas item as a file
 */
export function downloadCanvasExport(item: CanvasItem): void {
    const exported = exportCanvasItem(item);
    const blob = new Blob([exported], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mira`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Read canvas item from file
 */
export async function readCanvasFromFile(file: File): Promise<CanvasItem | null> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            resolve(importCanvasItem(content));
        };
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
    });
}

// Session storage utilities
const SESSION_STORAGE_KEY = 'mira-canvas-sessions';

function saveSession(session: CollabSession): void {
    try {
        const sessions = loadSessions();
        const index = sessions.findIndex(s => s.id === session.id);
        if (index >= 0) {
            sessions[index] = session;
        } else {
            sessions.push(session);
        }
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
        console.warn('Failed to save session:', e);
    }
}

function loadSessions(): CollabSession[] {
    try {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * Get active session for an item
 */
export function getActiveSession(itemId: string): CollabSession | null {
    const sessions = loadSessions();
    return sessions.find(s => s.itemId === itemId) || null;
}

/**
 * Update session activity
 */
export function updateSessionActivity(sessionId: string): void {
    const sessions = loadSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
        session.lastActivity = Date.now();
        saveSession(session);
    }
}

/**
 * Close a collaboration session
 */
export function closeSession(sessionId: string): void {
    try {
        const sessions = loadSessions().filter(s => s.id !== sessionId);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
        console.warn('Failed to close session:', e);
    }
}
