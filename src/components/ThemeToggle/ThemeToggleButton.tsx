'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '~/lib/utils';
import { themeToggleSizes } from './_utils/theme-toggle-styles';

interface ThemeToggleButtonProps {
  isDark: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ThemeToggleButton({ 
  isDark, 
  onToggle, 
  size = 'md',
  className 
}: ThemeToggleButtonProps) {
  const sizes = themeToggleSizes[size];
  
  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center justify-center rounded-3xl transition-all duration-200 m-2',
        'bg-muted hover:bg-accent hover:text-accent-foreground',
        'text-foreground',
        sizes.container,
        className
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-pressed={isDark}
    >
      {isDark ? (
        <Moon className={cn(sizes.icon, 'text-primary dark:text-primary')} />
      ) : (
        <Sun className={cn(sizes.icon, 'text-secondary')} />
      )}
    </button>
  );
}