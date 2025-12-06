/**
 * Canvas Versioning System
 * Manages version history for canvas items with auto-save functionality
 */

import type { CanvasItem } from './canvas';

export interface CanvasVersion {
    id: string;
    itemId: string;
    content: string;
    timestamp: number;
    label?: string;
    autoSaved: boolean;
}

export interface DiffResult {
    additions: number;
    deletions: number;
    changes: DiffChange[];
}

export interface DiffChange {
    type: 'add' | 'remove' | 'unchanged';
    content: string;
    lineNumber: number;
}

// Storage key prefix for versions
const VERSION_STORAGE_PREFIX = 'mira-canvas-versions-';
const MAX_VERSIONS_PER_ITEM = 50;
const AUTO_SAVE_THRESHOLD = 50; // Minimum character changes to trigger auto-save

/**
 * Generate unique version ID
 */
function generateVersionId(): string {
    return `ver_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Create a new version for a canvas item
 */
export function createVersion(
    item: CanvasItem,
    label?: string,
    autoSaved: boolean = false
): CanvasVersion {
    const version: CanvasVersion = {
        id: generateVersionId(),
        itemId: item.id,
        content: item.content,
        timestamp: Date.now(),
        label,
        autoSaved,
    };

    // Save to storage
    const versions = loadVersions(item.id);
    versions.unshift(version); // Add to beginning (newest first)

    // Prune old versions if needed
    const prunedVersions = versions.slice(0, MAX_VERSIONS_PER_ITEM);
    saveVersions(item.id, prunedVersions);

    return version;
}

/**
 * Get version history for a canvas item
 */
export function getVersionHistory(itemId: string): CanvasVersion[] {
    return loadVersions(itemId);
}

/**
 * Get a specific version by ID
 */
export function getVersion(itemId: string, versionId: string): CanvasVersion | null {
    const versions = loadVersions(itemId);
    return versions.find(v => v.id === versionId) || null;
}

/**
 * Restore a canvas item to a specific version
 */
export function restoreVersion(itemId: string, versionId: string): string | null {
    const version = getVersion(itemId, versionId);
    return version?.content || null;
}

/**
 * Update version label
 */
export function updateVersionLabel(itemId: string, versionId: string, label: string): boolean {
    const versions = loadVersions(itemId);
    const index = versions.findIndex(v => v.id === versionId);

    if (index === -1) return false;

    versions[index].label = label;
    saveVersions(itemId, versions);
    return true;
}

/**
 * Delete a specific version
 */
export function deleteVersion(itemId: string, versionId: string): boolean {
    const versions = loadVersions(itemId);
    const filtered = versions.filter(v => v.id !== versionId);

    if (filtered.length === versions.length) return false;

    saveVersions(itemId, filtered);
    return true;
}

/**
 * Check if content change is significant enough for auto-save
 */
export function shouldAutoSave(currentContent: string, previousContent: string): boolean {
    if (!previousContent) return true;

    const diff = Math.abs(currentContent.length - previousContent.length);
    if (diff >= AUTO_SAVE_THRESHOLD) return true;

    // Also check for significant line changes
    const currentLines = currentContent.split('\n').length;
    const previousLines = previousContent.split('\n').length;
    if (Math.abs(currentLines - previousLines) >= 5) return true;

    return false;
}

/**
 * Compare two versions and generate diff
 */
export function compareVersions(v1: CanvasVersion, v2: CanvasVersion): DiffResult {
    const lines1 = v1.content.split('\n');
    const lines2 = v2.content.split('\n');

    const changes: DiffChange[] = [];
    let additions = 0;
    let deletions = 0;

    // Simple line-by-line diff
    const maxLength = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLength; i++) {
        const line1 = lines1[i];
        const line2 = lines2[i];

        if (line1 === undefined) {
            // Line added in v2
            changes.push({ type: 'add', content: line2, lineNumber: i + 1 });
            additions++;
        } else if (line2 === undefined) {
            // Line removed in v2
            changes.push({ type: 'remove', content: line1, lineNumber: i + 1 });
            deletions++;
        } else if (line1 !== line2) {
            // Line changed
            changes.push({ type: 'remove', content: line1, lineNumber: i + 1 });
            changes.push({ type: 'add', content: line2, lineNumber: i + 1 });
            additions++;
            deletions++;
        } else {
            // Line unchanged
            changes.push({ type: 'unchanged', content: line1, lineNumber: i + 1 });
        }
    }

    return { additions, deletions, changes };
}

/**
 * Get diff summary text
 */
export function getDiffSummary(diff: DiffResult): string {
    const parts: string[] = [];
    if (diff.additions > 0) parts.push(`+${diff.additions}`);
    if (diff.deletions > 0) parts.push(`-${diff.deletions}`);
    return parts.join(' ') || 'No changes';
}

/**
 * Format timestamp for display
 */
export function formatVersionTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    // Less than a minute
    if (diff < 60000) return 'Just now';

    // Less than an hour
    if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return `${mins} min${mins > 1 ? 's' : ''} ago`;
    }

    // Less than a day
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    // Format as date
    return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Save versions to localStorage
 */
export function saveVersions(itemId: string, versions: CanvasVersion[]): void {
    try {
        const key = `${VERSION_STORAGE_PREFIX}${itemId}`;
        localStorage.setItem(key, JSON.stringify(versions));
    } catch (e) {
        console.warn('Failed to save versions:', e);
    }
}

/**
 * Load versions from localStorage
 */
export function loadVersions(itemId: string): CanvasVersion[] {
    try {
        const key = `${VERSION_STORAGE_PREFIX}${itemId}`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.warn('Failed to load versions:', e);
        return [];
    }
}

/**
 * Delete all versions for an item
 */
export function clearVersionHistory(itemId: string): void {
    try {
        const key = `${VERSION_STORAGE_PREFIX}${itemId}`;
        localStorage.removeItem(key);
    } catch (e) {
        console.warn('Failed to clear version history:', e);
    }
}

/**
 * Prune old versions, keeping only the most recent ones
 */
export function pruneOldVersions(itemId: string, maxVersions: number = MAX_VERSIONS_PER_ITEM): void {
    const versions = loadVersions(itemId);
    if (versions.length > maxVersions) {
        saveVersions(itemId, versions.slice(0, maxVersions));
    }
}
