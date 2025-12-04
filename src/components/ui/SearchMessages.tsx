import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Calendar, MessageSquare, ChevronRight } from 'lucide-react';
import { chatStorage } from '../../lib/chatStorage';
import type { ChatSession } from '../../lib/chatStorage';

interface SearchMessagesProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  currentSessionId?: string;
}

export function SearchMessages({
  isOpen,
  onClose,
  onSelectSession,
  currentSessionId,
}: SearchMessagesProps) {
  const [query, setQuery] = useState('');
  const [sessions] = useState<ChatSession[]>(() => chatStorage.getAllSessions());

  // Search through all sessions and messages
  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const results: Array<{
      session: ChatSession;
      matches: Array<{
        messageIndex: number;
        content: string;
        role: 'user' | 'assistant';
        matchStart: number;
        matchEnd: number;
      }>;
    }> = [];

    sessions.forEach((session) => {
      const matches: typeof results[0]['matches'] = [];

      session.messages.forEach((message, index) => {
        const lowerContent = message.content.toLowerCase();
        const matchIndex = lowerContent.indexOf(lowerQuery);
        
        if (matchIndex !== -1) {
          matches.push({
            messageIndex: index,
            content: message.content,
            role: message.role,
            matchStart: matchIndex,
            matchEnd: matchIndex + query.length,
          });
        }
      });

      // Also check session title
      if (session.title.toLowerCase().includes(lowerQuery)) {
        results.push({ session, matches });
      } else if (matches.length > 0) {
        results.push({ session, matches });
      }
    });

    // Sort by most recent
    return results.sort((a, b) => b.session.updatedAt - a.session.updatedAt);
  }, [query, sessions]);

  const highlightMatch = useCallback((text: string, start: number, end: number) => {
    // Get surrounding context (up to 50 chars before and after)
    const contextStart = Math.max(0, start - 50);
    const contextEnd = Math.min(text.length, end + 50);
    
    const before = text.slice(contextStart, start);
    const match = text.slice(start, end);
    const after = text.slice(end, contextEnd);
    
    return (
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {contextStart > 0 && '...'}
        {before}
        <span className="bg-yellow-300 dark:bg-yellow-500/50 text-gray-900 dark:text-white font-medium px-0.5 rounded">
          {match}
        </span>
        {after}
        {contextEnd < text.length && '...'}
      </span>
    );
  }, []);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleSelectSession = (sessionId: string) => {
    onSelectSession(sessionId);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-[10%] left-1/2 -translate-x-1/2 w-full max-w-2xl
              bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-50
              border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Search header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search messages..."
                  autoFocus
                  className="w-full pl-12 pr-12 py-3 rounded-xl
                    bg-gray-100 dark:bg-gray-800
                    border border-gray-200 dark:border-gray-700
                    text-gray-900 dark:text-white
                    placeholder-gray-500 dark:placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-orange-500
                    text-lg"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2
                      text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {query.trim() === '' ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Search size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Search your conversations</p>
                  <p className="text-sm mt-1">Find messages across all your chat sessions</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No results found</p>
                  <p className="text-sm mt-1">Try searching for different keywords</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {searchResults.map(({ session, matches }) => (
                    <motion.button
                      key={session.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => handleSelectSession(session.id)}
                      className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50
                        transition-colors duration-150
                        ${currentSessionId === session.id ? 'bg-orange-50 dark:bg-orange-500/10' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Session title */}
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare size={16} className="text-orange-500 flex-shrink-0" />
                            <h3 className="font-medium text-gray-900 dark:text-white truncate">
                              {session.title}
                            </h3>
                          </div>

                          {/* Match previews */}
                          {matches.slice(0, 2).map((match, idx) => (
                            <div
                              key={idx}
                              className="mt-2 pl-6 border-l-2 border-gray-200 dark:border-gray-600"
                            >
                              <span className={`text-xs font-medium uppercase tracking-wide
                                ${match.role === 'user' 
                                  ? 'text-orange-500' 
                                  : 'text-green-500'
                                }`}
                              >
                                {match.role === 'user' ? 'You' : 'Mira'}
                              </span>
                              <div className="mt-0.5">
                                {highlightMatch(match.content, match.matchStart, match.matchEnd)}
                              </div>
                            </div>
                          ))}

                          {matches.length > 2 && (
                            <p className="mt-2 pl-6 text-xs text-gray-500">
                              +{matches.length - 2} more matches
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-gray-400 flex-shrink-0">
                          <div className="flex items-center gap-1 text-xs">
                            <Calendar size={12} />
                            <span>{formatDate(session.updatedAt)}</span>
                          </div>
                          <ChevronRight size={16} />
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700
              bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {searchResults.length > 0
                  ? `${searchResults.length} conversation${searchResults.length !== 1 ? 's' : ''} found`
                  : 'Press Esc to close'}
              </span>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Esc</kbd>
                <span>to close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Compact search trigger button
interface SearchButtonProps {
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function SearchButton({ onClick, size = 'md' }: SearchButtonProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`${sizeClasses[size]} flex items-center justify-center rounded-xl
        bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10
        text-gray-700 dark:text-gray-200 transition-all duration-200
        border border-gray-200 dark:border-white/10`}
      aria-label="Search messages"
    >
      <Search size={iconSizes[size]} />
    </motion.button>
  );
}
