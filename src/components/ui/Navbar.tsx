import { motion } from 'framer-motion';
import {
  Menu,
  Plus,
  Search,
  Settings,
  User,
  X
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface NavbarProps {
  onMenuClick?: () => void;
  onNewChat?: () => void;
  onSearchClick?: () => void;
  onSettingsClick?: () => void;
  showMenu?: boolean;
  chatTitle?: string;
}

export function Navbar({
  onMenuClick,
  onNewChat,
  onSearchClick,
  onSettingsClick,
  showMenu = true,
  chatTitle,
}: NavbarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 h-16 z-40
        bg-background/80 backdrop-blur-xl
        border-b border-white/5"
    >
      <div className="h-full max-w-[1600px] mx-auto px-4 flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-3">
          {showMenu && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onMenuClick}
              className="w-10 h-10 flex items-center justify-center rounded-lg
                hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200
                md:hidden"
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </motion.button>
          )}

          {/* Logo */}
          <motion.div
            className="flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
          >
            <span className="text-xl font-bold text-white tracking-tight hidden sm:block">
              MIRA
            </span>
          </motion.div>

          {/* Chat title */}
          {chatTitle && (
            <>
              <div className="w-px h-5 bg-white/10 mx-2 hidden md:block" />
              <span className="text-sm text-gray-400 truncate max-w-[200px] hidden md:block">
                {chatTitle}
              </span>
            </>
          )}
        </div>

        {/* Center section - can be used for tabs or navigation */}
        <div className="hidden lg:flex items-center gap-1">
          <NavTab active>Chat</NavTab>
          <NavTab disabled>Explore</NavTab>
          <NavTab disabled>History</NavTab>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* New Chat button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNewChat}
            className="h-9 px-4 flex items-center gap-2 rounded-full
              bg-white text-black hover:bg-gray-200 glow-hover
              font-medium text-sm transition-all duration-200"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Chat</span>
          </motion.button>

          {/* Search button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSearchClick}
            className="w-9 h-9 flex items-center justify-center rounded-full
              hover:bg-white/10 text-gray-400 hover:text-white glow-hover transition-all duration-200"
            aria-label="Search"
          >
            <Search size={18} />
          </motion.button>

          {/* Settings button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSettingsClick}
            className="w-9 h-9 flex items-center justify-center rounded-full
              hover:bg-white/10 text-gray-400 hover:text-white glow-hover transition-all duration-200"
            aria-label="Settings"
          >
            <Settings size={18} />
          </motion.button>

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-full
                bg-white/10 hover:bg-white/20
                text-white transition-all duration-200"
              aria-label="User menu"
            >
              <User size={18} />
            </motion.button>

            {/* User dropdown */}
            {isUserMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden
                  bg-[#161b22] border border-[#30363d]
                  shadow-xl z-50"
              >
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10
                      flex items-center justify-center">
                      <User size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Guest User</p>
                      <p className="text-xs text-gray-500">Free Plan</p>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <UserMenuItem icon={User} label="Profile" />
                  <UserMenuItem icon={Settings} label="Settings" onClick={onSettingsClick} />
                </div>

                <div className="p-2 border-t border-white/10">
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg
                      text-red-400 hover:bg-white/5
                      transition-colors duration-150 text-sm"
                  >
                    <X size={16} />
                    <span>Clear All Data</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
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
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
        ${active
          ? 'text-white bg-white/10'
          : disabled
            ? 'text-gray-600 cursor-not-allowed'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
    >
      {children}
    </button>
  );
}

// User menu item
interface UserMenuItemProps {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick?: () => void;
}

function UserMenuItem({ icon: Icon, label, onClick }: UserMenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg
        text-gray-300 hover:text-white hover:bg-white/5
        transition-colors duration-150 text-sm"
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );
}
