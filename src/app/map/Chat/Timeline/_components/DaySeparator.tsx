'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '~/lib/utils';

interface DaySeparatorProps {
  date: Date;
}

export function DaySeparator({ date }: DaySeparatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const formatDisplayDate = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTooltipDate = () => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
    });
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <>
      <div
        className="flex items-center justify-center gap-2 my-4 text-xs text-muted-foreground cursor-default"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Calendar className="w-3 h-3" />
        <span data-testid="chat-day-separator">{formatDisplayDate()}</span>
      </div>

      {showTooltip && (
        <div
          className={cn(
            "fixed z-[9999] px-3 py-2 max-w-xs",
            "dark:bg-neutral-900 bg-neutral-100",
            "dark:text-white text-neutral-900",
            "text-sm rounded-md shadow-lg",
            "border dark:border-neutral-700 border-neutral-300",
            "pointer-events-none -translate-x-1/2"
          )}
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
          }}
        >
          {formatTooltipDate()}
        </div>
      )}
    </>
  );
}