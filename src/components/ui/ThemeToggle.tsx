import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useState, useRef, useEffect } from 'react';

interface ThemeToggleProps {
  showDropdown?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ThemeToggle({ showDropdown = false, size = 'md' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themeOptions = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ];

  if (showDropdown) {
    return (
      <div className="relative" ref={dropdownRef}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`${sizeClasses[size]} flex items-center justify-center rounded-xl 
            bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10
            border border-gray-200 dark:border-white/10 transition-all duration-200
            text-gray-700 dark:text-gray-200`}
          aria-label="Toggle theme"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={resolvedTheme}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {resolvedTheme === 'dark' ? (
                <Moon size={iconSizes[size]} />
              ) : (
                <Sun size={iconSizes[size]} />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-36 rounded-xl overflow-hidden
                bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                shadow-lg z-50"
            >
              {themeOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => {
                    setTheme(value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm
                    transition-colors duration-150
                    ${theme === value 
                      ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  {theme === value && (
                    <motion.div
                      layoutId="theme-check"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500"
                    />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Simple toggle button
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className={`${sizeClasses[size]} flex items-center justify-center rounded-xl 
        bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10
        border border-gray-200 dark:border-white/10 transition-all duration-200
        text-gray-700 dark:text-gray-200`}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={resolvedTheme}
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.2 }}
        >
          {resolvedTheme === 'dark' ? (
            <Moon size={iconSizes[size]} />
          ) : (
            <Sun size={iconSizes[size]} className="text-amber-500" />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}
