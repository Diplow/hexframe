'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '~/lib/utils';
import { getIconClasses, getPillClasses, getPillStyles } from './_utils/theme-toggle-styles';
import { useDragInteraction } from './_hooks/useDragInteraction';

interface DraggableThemePillProps {
  isDark: boolean;
  onToggle: () => void;
  className?: string;
}

export function DraggableThemePill({ isDark, onToggle, className }: DraggableThemePillProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { isDragging, dragOffset, handleDragStart } = useDragInteraction({
    isDark,
    onThresholdCrossed: onToggle,
    containerRef
  });


  return (
    <div 
      ref={containerRef}
      className={cn(
        'relative rounded-3xl overflow-hidden',
        'h-12 w-full',
        className
      )}
    >
      <ThemePillBackground isDark={isDark} />
      <ThemePillIcons isDark={isDark} isDragging={isDragging} onToggle={onToggle} />
      <DraggablePill 
        isDark={isDark} 
        isDragging={isDragging}
        dragOffset={dragOffset}
        onDragStart={handleDragStart}
      />
    </div>
  );
}

function ThemePillBackground({ isDark }: { isDark: boolean }) {
  return (
    <div
      className={cn(
        'absolute inset-0 flex items-center justify-between rounded-3xl transition-all duration-200',
        'bg-neutral-200 dark:bg-neutral-700',
        'select-none'
      )}
      role="group"
      aria-label={`Theme toggle. Current theme: ${isDark ? 'dark' : 'light'}`}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 40 }}>
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 select-none">
          Theme
        </span>
      </div>
    </div>
  );
}

function ThemePillIcons({ isDark, isDragging, onToggle }: { 
  isDark: boolean; 
  isDragging: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none" style={{ zIndex: 50 }}>
      <button
        onClick={() => {
          if (isDark && !isDragging) {
            onToggle();
          }
        }}
        className={cn(
          'group flex items-center justify-center w-5 h-5 rounded-full',
          'transition-colors pointer-events-auto',
          'focus:outline-none focus-visible:outline-none',
          !isDark && 'pointer-events-none'
        )}
        aria-label="Switch to light mode"
        disabled={!isDark}
      >
        <Sun className={cn('w-5 h-5', getIconClasses(isDark, 'sun'))} />
      </button>
      <button
        onClick={() => {
          if (!isDark && !isDragging) {
            onToggle();
          }
        }}
        className={cn(
          'group flex items-center justify-center w-5 h-5 rounded-full',
          'transition-colors pointer-events-auto',
          'focus:outline-none focus-visible:outline-none',
          isDark && 'pointer-events-none'
        )}
        aria-label="Switch to dark mode"
        disabled={isDark}
      >
        <Moon className={cn('w-5 h-5', getIconClasses(isDark, 'moon'))} />
      </button>
    </div>
  );
}

function DraggablePill({ isDark, isDragging, dragOffset, onDragStart }: {
  isDark: boolean;
  isDragging: boolean;
  dragOffset: number;
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
}) {
  // For dark mode, position from left but offset to the right side
  // For light mode, position from left at 0
  const initialOffset = isDark ? 'calc(50% - 2.5rem)' : '0';
  

  return (
    <div
      data-testid="draggable-pill"
      onMouseDown={onDragStart}
      onTouchStart={onDragStart}
      className={getPillClasses(isDark, isDragging)}
      style={{
        zIndex: 30,
        left: initialOffset,
        ...getPillStyles(isDark),
        transform: `translateX(${dragOffset}px)`
      }}
    />
  );
}