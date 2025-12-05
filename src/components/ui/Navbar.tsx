import { motion } from 'framer-motion';
import {
  Menu,
  Plus,
  Search,
  Settings,
  User,
  Sparkles,
  LogOut,
  Share2,
  Brain,
  Building2
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthModal } from './AuthModal';

interface NavbarProps {
  onMenuClick?: () => void;
  onNewChat?: () => void;
  onSearchClick?: () => void;
  onSettingsClick?: () => void;
  onShareClick?: () => void;
  onMemoryClick?: () => void;
  onWorkspaceClick?: () => void;
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
  showMenu = true,
  chatTitle,
}: NavbarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { user, isAuthenticated, signOut } = useAuth();

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignIn = () => {
    setAuthMode('signin');
    setAuthModalOpen(true);
  };

  const handleSignUp = () => {
    setAuthMode('signup');
    setAuthModalOpen(true);
  };

  const handleSignOut = () => {
    signOut();
    setIsUserMenuOpen(false);
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 h-16 z-40
        bg-[#0a0a0a]/95 backdrop-blur-xl
        border-b border-white/[0.08]
        shadow-lg shadow-black/20"
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent pointer-events-none" />

      <div className="relative h-full max-w-[1800px] mx-auto px-4 md:px-6 flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-3 md:gap-4">
          {showMenu && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onMenuClick}
              className="w-10 h-10 flex items-center justify-center rounded-xl
                hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200
                md:hidden border border-transparent hover:border-white/10"
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </motion.button>
          )}

          {/* Logo */}
          <motion.div
            className="flex items-center gap-2.5"
            whileHover={{ scale: 1.02 }}
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
                <Sparkles size={18} className="text-white" />
              </div>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl blur opacity-30 -z-10" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight hidden sm:block
              bg-gradient-to-r from-white to-gray-300 bg-clip-text">
              Mira
            </span>
          </motion.div>

          {/* Chat title */}
          {chatTitle && (
            <>
              <div className="w-px h-6 bg-gradient-to-b from-transparent via-white/20 to-transparent mx-1 hidden md:block" />
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-gray-300 font-medium truncate max-w-[250px]">
                  {chatTitle}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Center section - Navigation tabs */}
        <div className="hidden lg:flex items-center gap-1">
          <NavTab active>Chat</NavTab>
          <NavTab disabled>Explore</NavTab>
          <NavTab disabled>Library</NavTab>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* New Chat button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNewChat}
            className="group h-10 px-4 md:px-5 flex items-center gap-2 rounded-xl
              bg-gradient-to-r from-white to-gray-100 hover:from-gray-100 hover:to-white
              text-black font-semibold text-sm transition-all duration-200
              shadow-lg shadow-white/10 hover:shadow-white/20"
          >
            <Plus size={18} className="transition-transform group-hover:rotate-90" />
            <span className="hidden sm:inline">New</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSearchClick}
            className="w-10 h-10 flex items-center justify-center rounded-xl
              hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200
              border border-transparent hover:border-white/10"
            aria-label="Search"
          >
            <Search size={18} />
          </motion.button>

          {/* Share button */}
          {chatTitle && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onShareClick}
              className="w-10 h-10 flex items-center justify-center rounded-xl
                hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200
                border border-transparent hover:border-white/10"
              aria-label="Share conversation"
            >
              <Share2 size={18} />
            </motion.button>
          )}

          {/* Settings button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSettingsClick}
            className="hidden sm:flex w-10 h-10 items-center justify-center rounded-xl
              hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200
              border border-transparent hover:border-white/10"
            aria-label="Settings"
          >
            <Settings size={18} />
          </motion.button>

          {/* Memory button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onMemoryClick}
            className="hidden sm:flex w-10 h-10 items-center justify-center rounded-xl
              hover:bg-white/10 text-gray-400 hover:text-purple-400 transition-all duration-200
              border border-transparent hover:border-purple-500/20"
            aria-label="Memory"
          >
            <Brain size={18} />
          </motion.button>

          {/* Workspace button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onWorkspaceClick}
            className="hidden sm:flex w-10 h-10 items-center justify-center rounded-xl
              hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-all duration-200
              border border-transparent hover:border-blue-500/20"
            aria-label="Workspaces"
          >
            <Building2 size={18} />
          </motion.button>

          {/* Auth buttons / User menu */}
          {isAuthenticated ? (
            <div className="relative" ref={userMenuRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="relative w-10 h-10 flex items-center justify-center rounded-xl
                  bg-gradient-to-br from-gray-800 to-gray-900
                  hover:from-gray-700 hover:to-gray-800
                  text-white transition-all duration-200
                  border border-white/20 shadow-lg"
                aria-label="User menu"
              >
                <User size={18} />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#0a0a0a] rounded-full" />
              </motion.button>

              {/* User dropdown */}
              {isUserMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute right-0 mt-3 w-64 rounded-2xl overflow-hidden
                    bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f]
                    border border-white/10
                    shadow-2xl shadow-black/50 z-50"
                >
                  {/* User info header */}
                  <div className="p-4 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900
                          flex items-center justify-center border border-white/20 shadow-lg">
                          <User size={20} className="text-white" />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-[#1a1a1a] rounded-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{user?.name || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="p-2">
                    <UserMenuItem icon={User} label="Profile" />
                    <UserMenuItem icon={Settings} label="Settings" onClick={onSettingsClick} />
                    <UserMenuItem icon={Sparkles} label="Upgrade to Pro" badge="New" variant="premium" />
                  </div>

                  {/* Danger zone */}
                  <div className="p-2 border-t border-white/10">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                        text-gray-400 hover:text-white hover:bg-white/5
                        transition-all duration-150 text-sm font-medium"
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSignIn}
                className="h-10 px-4 flex items-center rounded-xl
                  hover:bg-white/10 text-gray-300 hover:text-white
                  text-sm font-semibold transition-all duration-200
                  border border-transparent hover:border-white/10"
              >
                Sign in
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSignUp}
                className="h-10 px-4 flex items-center rounded-xl
                  bg-white text-black hover:bg-gray-200
                  text-sm font-semibold transition-all duration-200
                  shadow-lg shadow-white/10"
              >
                Sign up
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </motion.header>
  );
}

// Nav tab component
interface NavTabProps {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

function NavTab({ children, active, disabled, onClick }: NavTabProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200
        ${active
          ? 'text-white bg-white/10 shadow-lg border border-white/10'
          : disabled
            ? 'text-gray-600 cursor-not-allowed'
            : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10'
        }`}
    >
      {active && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 bg-white/5 rounded-xl -z-10"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      {children}
    </button>
  );
}

// User menu item
interface UserMenuItemProps {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick?: () => void;
  badge?: string;
  variant?: 'default' | 'premium';
}

function UserMenuItem({ icon: Icon, label, onClick, badge, variant = 'default' }: UserMenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
        transition-all duration-150 text-sm font-medium
        ${variant === 'premium'
          ? 'text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 border border-transparent hover:border-orange-500/20'
          : 'text-gray-300 hover:text-white hover:bg-white/5'
        }`}
    >
      <Icon size={16} />
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="px-1.5 py-0.5 bg-orange-500 text-white rounded text-[10px] font-bold uppercase">
          {badge}
        </span>
      )}
    </button>
  );
}
