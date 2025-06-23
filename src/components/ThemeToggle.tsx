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
    md: 'h-12 w-12',
    lg: 'h-14 w-14'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-7 w-7'
  };

  // When showing label, render full toggle with both icons
  if (showLabel) {
    const circleSize = size === 'sm' ? 'h-6 w-6' : size === 'md' ? 'h-10 w-10' : 'h-12 w-12';
    const buttonHeight = sizes[size]; // Use same height as icon-only mode
    const padding = size === 'sm' ? 'p-1' : size === 'md' ? 'p-1' : 'p-1';
    
    return (
      <button
        onClick={toggleTheme}
        className={cn(
          "relative flex items-center justify-between rounded-full transition-all duration-200",
          "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
          "focus:outline-none focus:ring-2 focus:ring-gray-500",
          buttonHeight.split(' ')[0], // Extract just the height class
          padding,
          className
        )}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        aria-pressed={isDark}
      >
        {/* Background icons - always show both */}
        <div className="relative z-10 flex items-center justify-between w-full h-full px-1">
          <div className={cn("flex items-center justify-center", circleSize)}>
            <Sun className={cn(
              iconSizes[size], 
              "transition-all duration-200",
              isDark ? "text-gray-400" : "text-gray-400 opacity-0"
            )} />
          </div>
          <div className={cn("flex items-center justify-center", circleSize)}>
            <Moon className={cn(
              iconSizes[size], 
              "transition-all duration-200",
              isDark ? "text-gray-400 opacity-0" : "text-gray-400"
            )} />
          </div>
        </div>
        
        {/* Sliding pill with label only */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-full bg-white dark:bg-gray-900",
            "shadow-sm transition-all duration-200 flex items-center gap-2",
            "h-10 pl-1 pr-4 pointer-events-none", // Fixed height with padding
            isDark ? "right-1" : "left-1" // Light mode on left, dark mode on right
          )}
        >
          <div className={cn("flex-shrink-0 flex items-center justify-center", circleSize)}>
            {isDark ? (
              <Moon className={cn(iconSizes[size], "text-blue-500")} />
            ) : (
              <Sun className={cn(iconSizes[size], "text-yellow-600")} />
            )}
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
            {isDark ? 'Dark' : 'Light'}
          </span>
        </div>
      </button>
    );
  }

  // When icon only, show just the active icon
  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "flex items-center justify-center rounded-lg transition-all duration-200",
        "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
        "text-gray-700 dark:text-gray-300",
        "focus:outline-none focus:ring-2 focus:ring-gray-500",
        sizes[size],
        className
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-pressed={isDark}
    >
      {isDark ? (
        <Moon className={cn(iconSizes[size], "text-blue-500")} />
      ) : (
        <Sun className={cn(iconSizes[size], "text-yellow-600")} />
      )}
    </button>
  );
}