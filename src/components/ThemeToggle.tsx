'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '~/contexts/ThemeContext';
import { cn } from '~/lib/utils';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ThemeToggle({ 
  className, 
  showLabel = false,
  size = 'md' 
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "flex items-center justify-center rounded-lg transition-all duration-200",
        "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
        "text-gray-700 dark:text-gray-300",
        "focus:outline-none focus:ring-2 focus:ring-gray-500",
        showLabel ? 'px-3 gap-2' : sizes[size],
        className
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-pressed={isDark}
    >
      {isDark ? (
        <Sun className={iconSizes[size]} />
      ) : (
        <Moon className={iconSizes[size]} />
      )}
      {showLabel && (
        <span className="text-sm font-medium">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
}