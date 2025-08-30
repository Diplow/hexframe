'use client';

import * as React from 'react';
import { useTheme } from '~/contexts/ThemeContext';
import { ThemeToggleButton } from '~/components/ThemeToggle/ThemeToggleButton';
import { DraggableThemePill } from '~/components/ThemeToggle/DraggableThemePill';

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

  if (showLabel) {
    return (
      <DraggableThemePill 
        isDark={isDark} 
        onToggle={toggleTheme} 
        className={className} 
      />
    );
  }

  return (
    <ThemeToggleButton 
      isDark={isDark} 
      onToggle={toggleTheme} 
      size={size} 
      className={className} 
    />
  );
}