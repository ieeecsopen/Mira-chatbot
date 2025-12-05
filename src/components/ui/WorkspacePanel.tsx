import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Plus, Users, X, Crown, UserPlus,
    Copy, Check, Trash2, LogOut, ChevronRight
} from 'lucide-react';
import { Button } from './button';
import {
    useWorkspaces,
    generateInviteCode,
    removeMember,
    type Workspace
} from '../../lib/workspaces';
import { useAuth } from '../../contexts/AuthContext';
import { showSuccess, showError } from '../../lib/toast';

interface WorkspacePanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const roleColors: Record<string, string> = {
    owner: 'text-yellow-400 bg-yellow-500/10',
    admin: 'text-purple-400 bg-purple-500/10',
    member: 'text-blue-400 bg-blue-500/10',
    viewer: 'text-gray-400 bg-gray-500/10',
};

const roleLabels: Record<string, string> = {
    owner: 'Owner',
    admin: 'Admin',
    member: 'Member',
    viewer: 'Viewer',
};

export function WorkspacePanel({ isOpen, onClose }: WorkspacePanelProps) {
    const { user, isAuthenticated } = useAuth();
    const userId = user?.id || 'guest';
    const { workspaces, activeWorkspace, create, remove, setActive } = useWorkspaces(userId);

    const [view, setView] = useState<'list' | 'create' | 'details'>('list');
    const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [copied, setCopied] = useState(false);

    const handleCreate = useCallback(() => {
        if (!newName.trim()) {
            showError('Please enter a workspace name');
            return;
        }

        const workspace = create(
            newName.trim(),
            { userId, name: user?.name || 'User', email: user?.email },
            newDescription.trim() || undefined
        );

        setActive(workspace.id);
        setNewName('');
        setNewDescription('');
        setView('list');
        showSuccess('Workspace created!');
    }, [newName, newDescription, create, setActive, userId, user]);

    const handleDelete = useCallback((workspace: Workspace) => {
        if (confirm(`Delete "${workspace.name}"? This cannot be undone.`)) {
            remove(workspace.id);
            if (selectedWorkspace?.id === workspace.id) {
                setSelectedWorkspace(null);
                setView('list');
            }
            showSuccess('Workspace deleted');
        }
    }, [remove, selectedWorkspace]);

    const handleGenerateInvite = useCallback((workspaceId: string) => {
        const code = generateInviteCode(workspaceId);
        setInviteCode(code);
    }, []);

    const handleCopyInvite = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(inviteCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            showSuccess('Invite code copied!');
        } catch {
            showError('Failed to copy');
        }
    }, [inviteCode]);

    const handleLeave = useCallback((workspace: Workspace) => {
        if (workspace.createdBy === userId) {
            showError('Owners cannot leave. Transfer ownership first or delete the workspace.');
            return;
        }

        if (confirm(`Leave "${workspace.name}"?`)) {
            removeMember(workspace.id, userId);
            if (activeWorkspace?.id === workspace.id) {
                setActive(null);
            }
            setSelectedWorkspace(null);
            setView('list');
            showSuccess('Left workspace');
        }
    }, [userId, activeWorkspace, setActive]);

    const handleSelectWorkspace = useCallback((workspace: Workspace) => {
        setSelectedWorkspace(workspace);
        setView('details');
        handleGenerateInvite(workspace.id);
    }, [handleGenerateInvite]);

    if (!isAuthenticated) {
        return (
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                            onClick={onClose}
                        />
                        <motion.div
                            initial={{ opacity: 0, x: 300 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 300 }}
                            className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 bg-[#0d1117] border-l border-[#30363d] flex items-center justify-center"
                        >
                            <div className="text-center p-8">
                                <Building2 size={48} className="mx-auto text-[#30363d] mb-4" />
                                <h3 className="text-lg font-semibold text-white mb-2">Sign in Required</h3>
                                <p className="text-[#8b949e] text-sm">
                                    Please sign in to create and join workspaces
                                </p>
                                <Button onClick={onClose} className="mt-4">Close</Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        );
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, x: 300 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 300 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50"
                    >
                        <div className="h-full bg-[#0d1117] border-l border-[#30363d] flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
                                <div className="flex items-center gap-3">
                                    {view !== 'list' && (
                                        <button
                                            onClick={() => setView('list')}
                                            className="p-1 text-[#8b949e] hover:text-white"
                                        >
                                            ←
                                        </button>
                                    )}
                                    <div className="p-2 rounded-lg bg-blue-500/10">
                                        <Building2 size={20} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">
                                            {view === 'create' ? 'New Workspace' : view === 'details' ? selectedWorkspace?.name : 'Workspaces'}
                                        </h2>
                                        <p className="text-sm text-[#8b949e]">
                                            {view === 'list' ? `${workspaces.length} workspace${workspaces.length !== 1 ? 's' : ''}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg text-[#8b949e] hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {view === 'list' && (
                                    <>
                                        {/* Create button */}
                                        <Button
                                            onClick={() => setView('create')}
                                            variant="outline"
                                            className="w-full mb-4 border-dashed border-[#30363d] text-[#8b949e] hover:text-white hover:border-blue-500/50"
                                        >
                                            <Plus size={16} className="mr-2" />
                                            Create Workspace
                                        </Button>

                                        {/* Workspace list */}
                                        {workspaces.length === 0 ? (
                                            <div className="text-center py-12">
                                                <Building2 size={48} className="mx-auto text-[#30363d] mb-4" />
                                                <p className="text-[#8b949e] mb-2">No workspaces yet</p>
                                                <p className="text-sm text-[#6e7681]">
                                                    Create a workspace to collaborate with your team
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {workspaces.map((workspace) => (
                                                    <motion.button
                                                        key={workspace.id}
                                                        layout
                                                        onClick={() => handleSelectWorkspace(workspace)}
                                                        className={`w-full p-4 rounded-lg border transition-all text-left ${activeWorkspace?.id === workspace.id
                                                            ? 'border-blue-500/50 bg-blue-500/10'
                                                            : 'border-[#30363d] hover:border-[#30363d]/80 bg-[#161b22]'
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                                                    {workspace.name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-medium text-white">{workspace.name}</h3>
                                                                    <p className="text-xs text-[#8b949e]">
                                                                        {workspace.members.length} member{workspace.members.length !== 1 ? 's' : ''}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <ChevronRight size={16} className="text-[#6e7681]" />
                                                        </div>
                                                    </motion.button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {view === 'create' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
                                                Workspace Name
                                            </label>
                                            <input
                                                type="text"
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                                placeholder="My Team"
                                                className="w-full px-4 py-3 bg-[#161b22] border border-[#30363d] rounded-lg text-white placeholder-[#6e7681] focus:outline-none focus:border-blue-500"
                                                autoFocus
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
                                                Description (optional)
                                            </label>
                                            <textarea
                                                value={newDescription}
                                                onChange={(e) => setNewDescription(e.target.value)}
                                                placeholder="What's this workspace for?"
                                                className="w-full px-4 py-3 bg-[#161b22] border border-[#30363d] rounded-lg text-white placeholder-[#6e7681] focus:outline-none focus:border-blue-500 resize-none h-24"
                                            />
                                        </div>
                                        <div className="flex gap-2 pt-4">
                                            <Button
                                                onClick={() => setView('list')}
                                                variant="ghost"
                                                className="flex-1 text-[#8b949e]"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleCreate}
                                                disabled={!newName.trim()}
                                                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                                            >
                                                Create Workspace
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {view === 'details' && selectedWorkspace && (
                                    <div className="space-y-6">
                                        {/* Active status */}
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => setActive(selectedWorkspace.id)}
                                                disabled={activeWorkspace?.id === selectedWorkspace.id}
                                                className={`flex-1 ${activeWorkspace?.id === selectedWorkspace.id
                                                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                                    }`}
                                            >
                                                {activeWorkspace?.id === selectedWorkspace.id ? '✓ Active' : 'Set Active'}
                                            </Button>
                                        </div>

                                        {/* Invite section */}
                                        <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d]">
                                            <div className="flex items-center gap-2 mb-3">
                                                <UserPlus size={16} className="text-[#8b949e]" />
                                                <span className="text-sm font-medium text-white">Invite Members</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={inviteCode}
                                                    readOnly
                                                    className="flex-1 px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-sm text-[#8b949e] font-mono"
                                                />
                                                <Button
                                                    onClick={handleCopyInvite}
                                                    variant="outline"
                                                    className="px-3"
                                                >
                                                    {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                                </Button>
                                            </div>
                                            <p className="text-xs text-[#6e7681] mt-2">
                                                Share this code to invite others
                                            </p>
                                        </div>

                                        {/* Members */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Users size={16} className="text-[#8b949e]" />
                                                <span className="text-sm font-medium text-white">
                                                    Members ({selectedWorkspace.members.length})
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                {selectedWorkspace.members.map((member) => (
                                                    <div
                                                        key={member.userId}
                                                        className="flex items-center justify-between p-3 rounded-lg bg-[#161b22] border border-[#30363d]"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white text-sm font-medium">
                                                                {member.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-white">
                                                                    {member.name}
                                                                    {member.userId === userId && (
                                                                        <span className="text-[#6e7681] ml-1">(you)</span>
                                                                    )}
                                                                </p>
                                                                {member.email && (
                                                                    <p className="text-xs text-[#6e7681]">{member.email}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[member.role]}`}>
                                                            {member.role === 'owner' && <Crown size={10} className="inline mr-1" />}
                                                            {roleLabels[member.role]}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="pt-4 border-t border-[#30363d] space-y-2">
                                            {selectedWorkspace.createdBy === userId ? (
                                                <button
                                                    onClick={() => handleDelete(selectedWorkspace)}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                    Delete Workspace
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleLeave(selectedWorkspace)}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                                >
                                                    <LogOut size={14} />
                                                    Leave Workspace
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
