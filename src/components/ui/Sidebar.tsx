import { Plus, Settings, MessageSquare, Trash2, Sparkles, LogOut } from 'lucide-react';
import { Button } from './button';
import type { ChatSession } from '../../lib/chatStorage';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
    chatSessions: ChatSession[];
    currentSessionId: string | null;
    onNewChat: () => void;
    onSelectSession: (session: ChatSession) => void;
    onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
}

export function Sidebar({
    chatSessions,
    currentSessionId,
    onNewChat,
    onSelectSession,
    onDeleteSession
}: SidebarProps) {
    const { user, isAuthenticated, signOut, signIn } = useAuth();

    return (
        <div className="hidden md:flex flex-col w-[280px] border-r border-border/50 bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] relative overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 flex flex-col h-full p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 px-1">
                    <div className="flex items-center gap-2.5">
                        <div className="relative">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                                <Sparkles size={16} className="text-white" />
                            </div>
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg blur opacity-20 -z-10" />
                        </div>
                        <div className="font-bold text-lg tracking-tight text-white">Mira</div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-white/5 text-gray-400 hover:text-white rounded-lg w-9 h-9 transition-all"
                    >
                        <Settings size={18} />
                    </Button>
                </div>

                {/* New Chat Button */}
                <Button
                    onClick={onNewChat}
                    className="relative group flex items-center justify-center gap-2.5 w-full px-4 py-2.5 mb-6 bg-gradient-to-r from-white to-gray-100 hover:from-gray-100 hover:to-white text-black rounded-xl transition-all font-medium text-sm shadow-lg shadow-white/10 hover:shadow-white/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus size={16} className="transition-transform group-hover:rotate-90" />
                    <span>New Chat</span>
                </Button>

                {/* Recent Chats Section */}
                <div className="flex-1 overflow-y-auto space-y-0.5 -mx-1 px-1">
                    <div className="flex items-center justify-between mb-3 px-2">
                        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                            Recent
                        </div>
                        {chatSessions.length > 0 && (
                            <div className="text-[10px] font-mono text-gray-600 tabular-nums">
                                {chatSessions.length}
                            </div>
                        )}
                    </div>

                    {/* Chat history items */}
                    {chatSessions.length > 0 ? (
                        <div className="space-y-0.5">
                            {chatSessions.map((session) => (
                                <div
                                    key={session.id}
                                    onClick={() => onSelectSession(session)}
                                    className={`group relative w-full flex items-center justify-between px-3 py-2.5 text-left rounded-lg transition-all cursor-pointer overflow-hidden ${currentSessionId === session.id
                                            ? 'bg-white/10 text-white shadow-lg shadow-white/5 border border-white/10'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                                        }`}
                                >
                                    {/* Active indicator */}
                                    {currentSessionId === session.id && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-orange-500 to-orange-600 rounded-r-full" />
                                    )}

                                    <div className="flex items-center gap-2.5 flex-1 min-w-0 ml-1">
                                        <MessageSquare
                                            size={15}
                                            className={`flex-shrink-0 transition-colors ${currentSessionId === session.id ? 'text-orange-500' : 'text-gray-500'
                                                }`}
                                        />
                                        <span className="truncate text-sm font-normal">
                                            {session.title}
                                        </span>
                                    </div>

                                    <button
                                        onClick={(e) => onDeleteSession(session.id, e)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 rounded-md transition-all flex-shrink-0"
                                        title="Delete chat"
                                    >
                                        <Trash2 size={13} className="text-gray-500 hover:text-red-400 transition-colors" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-600 text-xs py-8 px-4">
                            <div className="w-12 h-12 rounded-full bg-white/5 mx-auto mb-3 flex items-center justify-center border border-white/10">
                                <MessageSquare size={20} className="text-gray-600" />
                            </div>
                            <div className="text-sm mb-1">No conversations yet</div>
                            <div className="text-gray-700">Start a new chat to begin</div>
                        </div>
                    )}
                </div>

                {/* User Account Footer */}
                <div className="mt-auto pt-4 border-t border-white/10">
                    {isAuthenticated && user ? (
                        <div className="flex items-center justify-between gap-2">
                            <Button
                                variant="ghost"
                                className="flex-1 flex items-center justify-start gap-3 px-2.5 py-2.5 hover:bg-white/5 rounded-lg transition-all h-auto group"
                            >
                                <div className="relative">
                                    {user.avatar ? (
                                        <img 
                                            src={user.avatar} 
                                            alt={user.name} 
                                            className="w-9 h-9 rounded-lg object-cover border border-white/10 shadow-lg"
                                        />
                                    ) : (
                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm border border-white/10 shadow-lg">
                                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                    )}
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#0a0a0a] rounded-full" />
                                </div>
                                <div className="text-sm font-medium text-left flex-1 min-w-0">
                                    <div className="text-white group-hover:text-gray-200 transition-colors truncate">
                                        {user.name || 'User'}
                                    </div>
                                    <div className="text-xs text-gray-500 font-normal flex items-center gap-1.5">
                                        <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded text-[10px] font-semibold">
                                            FREE
                                        </span>
                                    </div>
                                </div>
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => signOut()}
                                className="h-9 w-9 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg"
                                title="Sign out"
                            >
                                <LogOut size={16} />
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="ghost"
                            onClick={() => signIn('','')}
                            className="w-full flex items-center justify-start gap-3 px-2.5 py-2.5 hover:bg-white/5 rounded-lg transition-all h-auto group"
                        >
                            <div className="relative">
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white font-bold text-sm border border-white/10 shadow-lg">
                                    G
                                </div>
                            </div>
                            <div className="text-sm font-medium text-left flex-1 min-w-0">
                                <div className="text-white group-hover:text-gray-200 transition-colors truncate">
                                    Guest User
                                </div>
                                <div className="text-xs text-gray-500 font-normal">
                                    Sign in to save chats
                                </div>
                            </div>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
