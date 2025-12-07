import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Share2,
  Brain,
  Building2,
  BarChart3,
  MoreHorizontal,
  X
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserButton } from '@clerk/clerk-react';

interface NavbarProps {
  onMenuClick?: () => void;
  onNewChat?: () => void;
  onSearchClick?: () => void;
  onSettingsClick?: () => void;
  onShareClick?: () => void;
  onMemoryClick?: () => void;
  onWorkspaceClick?: () => void;
  onAnalyticsClick?: () => void;
  showMenu?: boolean;
  chatTitle?: string;
}

export function Navbar({
  onMenuClick,
  onNewChat,
  onSearchClick,
  onSettingsClick,
  onShareClick,
  onMemoryClick,
  onWorkspaceClick,
  onAnalyticsClick,
  showMenu = true,
  chatTitle,
}: NavbarProps) {
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { isAuthenticated } = useAuth();

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setIsToolsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignIn = () => {
    navigate('/auth?mode=signin');
  };

  const handleSignUp = () => {
    navigate('/auth?mode=signup');
  };

  const handleToolAction = (action?: () => void) => {
    action?.();
    setIsToolsMenuOpen(false);
  };

  // Tools menu items
  const toolsMenuItems = [
    { icon: Search, label: 'Search', shortcut: '⌘K', onClick: onSearchClick },
    ...(chatTitle ? [{ icon: Share2, label: 'Share Chat', onClick: onShareClick }] : []),
    { icon: Settings, label: 'Settings', onClick: onSettingsClick },
    { icon: BarChart3, label: 'Analytics', onClick: onAnalyticsClick, color: 'text-emerald-400' },
    { icon: Brain, label: 'Memory', onClick: onMemoryClick, color: 'text-purple-400' },
    { icon: Building2, label: 'Workspaces', onClick: onWorkspaceClick, color: 'text-blue-400' },
  ];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 h-14 z-40
        bg-[#0a0a0a]/95 backdrop-blur-xl
        border-b border-white/[0.06]"
    >
      <div className="relative h-full max-w-[1800px] mx-auto px-4 flex items-center justify-between">
        {/* Left section - Logo */}
        <div className="flex items-center gap-3">
          {showMenu && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onMenuClick}
              className="w-9 h-9 flex items-center justify-center rounded-lg
              hover:bg-white/10 text-gray-400 hover:text-white transition-all
              md:hidden"
              aria-label="Toggle menu"
            >
              <Menu size={18} />
            </motion.button>
          )}

          {/* Logo */}
          <motion.div
            className="flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="text-lg font-semibold text-white tracking-tight hidden sm:block">
              Mira
            </span>
          </motion.div>
        </div>

        {/* Center - Chat title (only when exists) */}
        {chatTitle && (
          <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 max-w-[300px]">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
            <span className="text-sm text-gray-300 truncate">
              {chatTitle}
            </span>
          </div>
        )}

        {/* Right section - Actions */}
        <div className="flex items-center gap-2">
          {/* New Chat - Primary action */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onNewChat}
            className="h-9 px-4 flex items-center gap-2 rounded-lg
            bg-white hover:bg-gray-100
            text-black font-medium text-sm transition-all
            shadow-sm"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New</span>
          </motion.button>

          {/* Tools Menu - Progressive disclosure */}
          <div className="relative" ref={toolsMenuRef}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg
              transition-all ${isToolsMenuOpen
                  ? 'bg-white/15 text-white'
                  : 'hover:bg-white/10 text-gray-400 hover:text-white'
                }`}
              aria-label="Tools menu"
            >
              {isToolsMenuOpen ? <X size={18} /> : <MoreHorizontal size={18} />}
            </motion.button>

            {/* Tools Dropdown */}
            <AnimatePresence>
              {isToolsMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden
                  bg-[#1a1a1a] border border-white/10
                  shadow-xl shadow-black/40 z-50"
                >
                  <div className="p-1.5">
                    {toolsMenuItems.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => handleToolAction(item.onClick)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg
                        transition-all text-sm font-medium
                        ${item.color || 'text-gray-300'} hover:text-white hover:bg-white/10`}
                      >
                        <item.icon size={16} />
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.shortcut && (
                          <span className="text-[10px] text-gray-600 font-mono">{item.shortcut}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu */}
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9 rounded-lg border border-white/10",
                    userButtonPopoverCard: "bg-[#1a1a1a] border border-white/10 shadow-xl shadow-black/40",
                    userButtonPopoverFooter: "hidden"
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSignIn}
                className="h-9 px-3 flex items-center rounded-lg
                hover:bg-white/10 text-gray-300 hover:text-white
                text-sm font-medium transition-all"
              >
                Sign in
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSignUp}
                className="h-9 px-3 flex items-center rounded-lg
                bg-white text-black hover:bg-gray-100
                text-sm font-medium transition-all"
              >
                Sign up
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
}
