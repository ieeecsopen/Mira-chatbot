/**
 * Team Workspaces for MIRA
 * Enables shared document context and collaboration
 */

export interface WorkspaceMember {
    userId: string;
    name: string;
    email?: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    joinedAt: number;
    lastActiveAt: number;
}

export interface WorkspaceChat {
    id: string;
    title: string;
    createdBy: string;
    createdAt: number;
    lastMessageAt: number;
    messageCount: number;
}

export interface Workspace {
    id: string;
    name: string;
    description?: string;
    avatar?: string;
    createdAt: number;
    createdBy: string;
    members: WorkspaceMember[];
    chats: WorkspaceChat[];
    settings: {
        visibility: 'private' | 'team' | 'public';
        allowMemberInvites: boolean;
        requireApproval: boolean;
    };
}

const WORKSPACES_KEY = 'mira-workspaces';
const ACTIVE_WORKSPACE_KEY = 'mira-active-workspace';

/**
 * Get all workspaces
 */
export function getAllWorkspaces(): Workspace[] {
    try {
        const stored = localStorage.getItem(WORKSPACES_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Failed to load workspaces:', e);
    }
    return [];
}

/**
 * Save all workspaces
 */
function saveWorkspaces(workspaces: Workspace[]): void {
    try {
        localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
    } catch (e) {
        console.warn('Failed to save workspaces:', e);
    }
}

/**
 * Generate workspace ID
 */
function generateId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Create a new workspace
 */
export function createWorkspace(
    name: string,
    creator: { userId: string; name: string; email?: string },
    description?: string
): Workspace {
    const workspace: Workspace = {
        id: generateId(),
        name,
        description,
        createdAt: Date.now(),
        createdBy: creator.userId,
        members: [
            {
                userId: creator.userId,
                name: creator.name,
                email: creator.email,
                role: 'owner',
                joinedAt: Date.now(),
                lastActiveAt: Date.now(),
            },
        ],
        chats: [],
        settings: {
            visibility: 'private',
            allowMemberInvites: true,
            requireApproval: false,
        },
    };

    const workspaces = getAllWorkspaces();
    workspaces.push(workspace);
    saveWorkspaces(workspaces);

    console.log(`🏢 Workspace created: ${name}`);
    return workspace;
}

/**
 * Get workspace by ID
 */
export function getWorkspace(workspaceId: string): Workspace | null {
    const workspaces = getAllWorkspaces();
    return workspaces.find(w => w.id === workspaceId) || null;
}

/**
 * Update a workspace
 */
export function updateWorkspace(workspaceId: string, updates: Partial<Omit<Workspace, 'id' | 'createdAt' | 'createdBy'>>): boolean {
    const workspaces = getAllWorkspaces();
    const index = workspaces.findIndex(w => w.id === workspaceId);

    if (index !== -1) {
        workspaces[index] = { ...workspaces[index], ...updates };
        saveWorkspaces(workspaces);
        return true;
    }
    return false;
}

/**
 * Delete a workspace
 */
export function deleteWorkspace(workspaceId: string): boolean {
    const workspaces = getAllWorkspaces();
    const filtered = workspaces.filter(w => w.id !== workspaceId);

    if (filtered.length < workspaces.length) {
        saveWorkspaces(filtered);
        // Clear active if this was active
        if (getActiveWorkspaceId() === workspaceId) {
            setActiveWorkspace(null);
        }
        console.log(`🗑️ Workspace deleted: ${workspaceId}`);
        return true;
    }
    return false;
}

/**
 * Add member to workspace
 */
export function addMember(
    workspaceId: string,
    member: { userId: string; name: string; email?: string },
    role: WorkspaceMember['role'] = 'member'
): boolean {
    const workspaces = getAllWorkspaces();
    const workspace = workspaces.find(w => w.id === workspaceId);

    if (!workspace) return false;

    // Check if already a member
    if (workspace.members.some(m => m.userId === member.userId)) {
        return false;
    }

    workspace.members.push({
        userId: member.userId,
        name: member.name,
        email: member.email,
        role,
        joinedAt: Date.now(),
        lastActiveAt: Date.now(),
    });

    saveWorkspaces(workspaces);
    console.log(`👤 Added ${member.name} to workspace`);
    return true;
}

/**
 * Remove member from workspace
 */
export function removeMember(workspaceId: string, userId: string): boolean {
    const workspaces = getAllWorkspaces();
    const workspace = workspaces.find(w => w.id === workspaceId);

    if (!workspace) return false;

    const originalLength = workspace.members.length;
    workspace.members = workspace.members.filter(m => m.userId !== userId);

    if (workspace.members.length < originalLength) {
        saveWorkspaces(workspaces);
        return true;
    }
    return false;
}

/**
 * Update member role
 */
export function updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceMember['role']
): boolean {
    const workspaces = getAllWorkspaces();
    const workspace = workspaces.find(w => w.id === workspaceId);

    if (!workspace) return false;

    const member = workspace.members.find(m => m.userId === userId);
    if (member) {
        member.role = role;
        saveWorkspaces(workspaces);
        return true;
    }
    return false;
}

/**
 * Add chat to workspace
 */
export function addWorkspaceChat(
    workspaceId: string,
    chat: { id: string; title: string; createdBy: string }
): boolean {
    const workspaces = getAllWorkspaces();
    const workspace = workspaces.find(w => w.id === workspaceId);

    if (!workspace) return false;

    workspace.chats.push({
        id: chat.id,
        title: chat.title,
        createdBy: chat.createdBy,
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
        messageCount: 0,
    });

    saveWorkspaces(workspaces);
    return true;
}

/**
 * Get workspaces for a user
 */
export function getUserWorkspaces(userId: string): Workspace[] {
    return getAllWorkspaces().filter(w => w.members.some(m => m.userId === userId));
}

/**
 * Get active workspace ID
 */
export function getActiveWorkspaceId(): string | null {
    return localStorage.getItem(ACTIVE_WORKSPACE_KEY);
}

/**
 * Set active workspace
 */
export function setActiveWorkspace(workspaceId: string | null): void {
    if (workspaceId) {
        localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
    } else {
        localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    }
}

/**
 * Get active workspace
 */
export function getActiveWorkspace(): Workspace | null {
    const id = getActiveWorkspaceId();
    return id ? getWorkspace(id) : null;
}

/**
 * Generate invite code
 */
export function generateInviteCode(workspaceId: string): string {
    // Simple invite code - in production, this would be cryptographically secure
    return btoa(`${workspaceId}:${Date.now()}`).replace(/=/g, '');
}

/**
 * Parse invite code
 */
export function parseInviteCode(code: string): { workspaceId: string; timestamp: number } | null {
    try {
        const decoded = atob(code);
        const [workspaceId, timestamp] = decoded.split(':');
        return { workspaceId, timestamp: parseInt(timestamp, 10) };
    } catch {
        return null;
    }
}

/**
 * React hook for workspaces
 */
import { useState, useCallback, useEffect } from 'react';

export function useWorkspaces(userId: string) {
    const [workspaces, setWorkspacesState] = useState<Workspace[]>(() => getUserWorkspaces(userId));
    const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(() => getActiveWorkspace());

    // Refresh on storage change
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === WORKSPACES_KEY) {
                setWorkspacesState(getUserWorkspaces(userId));
            }
            if (e.key === ACTIVE_WORKSPACE_KEY) {
                setActiveWorkspaceState(getActiveWorkspace());
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [userId]);

    const create = useCallback((name: string, creator: { userId: string; name: string; email?: string }, description?: string) => {
        const workspace = createWorkspace(name, creator, description);
        setWorkspacesState(getUserWorkspaces(userId));
        return workspace;
    }, [userId]);

    const remove = useCallback((workspaceId: string) => {
        deleteWorkspace(workspaceId);
        setWorkspacesState(getUserWorkspaces(userId));
    }, [userId]);

    const setActive = useCallback((workspaceId: string | null) => {
        setActiveWorkspace(workspaceId);
        setActiveWorkspaceState(workspaceId ? getWorkspace(workspaceId) : null);
    }, []);

    const refresh = useCallback(() => {
        setWorkspacesState(getUserWorkspaces(userId));
        setActiveWorkspaceState(getActiveWorkspace());
    }, [userId]);

    return {
        workspaces,
        activeWorkspace,
        create,
        remove,
        setActive,
        refresh,
    };
}
