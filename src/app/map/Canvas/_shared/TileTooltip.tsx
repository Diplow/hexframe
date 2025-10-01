'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '~/lib/utils';

interface TileTooltipProps {
  children: React.ReactNode;
  preview?: string;
  title?: string;
  disabled?: boolean;
}

export function TileTooltip({ children, preview, title, disabled }: TileTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Show tooltip if we have preview text and not disabled
  // Also show for testing if title is provided but no preview (temporary)
  const shouldShowTooltip = !disabled && ((preview?.trim().length ?? 0) > 0 || (!preview && title));

  useEffect(() => {
    if (!isVisible || !containerRef.current || !tooltipRef.current) return;

    const container = containerRef.current;
    const tooltip = tooltipRef.current;
    const containerRect = container.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    // Position tooltip above the tile, centered
    let x = containerRect.left + (containerRect.width / 2) - (tooltipRect.width / 2);
    let y = containerRect.top - tooltipRect.height - 8;

    // Keep tooltip within viewport
    const viewportWidth = window.innerWidth;

    if (x < 8) x = 8;
    if (x + tooltipRect.width > viewportWidth - 8) x = viewportWidth - tooltipRect.width - 8;
    if (y < 8) y = containerRect.bottom + 8; // Show below if no space above

    setPosition({ x, y });
  }, [isVisible]);

  const handleMouseEnter = () => {
    if (shouldShowTooltip) {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <>
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative"
      >
        {children}
      </div>

      {/* Tooltip portal */}
      {isVisible && shouldShowTooltip && (
        <div
          ref={tooltipRef}
          className={cn(
            "fixed z-[9999] px-3 py-2 max-w-xs",
            "bg-neutral-900 dark:bg-neutral-100",
            "text-white dark:text-neutral-900",
            "text-sm rounded-md shadow-lg",
            "border border-neutral-700 dark:border-neutral-300",
            "pointer-events-none"
          )}
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          {preview ? (
            <>
              {title && (
                <div className="font-medium mb-1 text-xs opacity-75">
                  {title}
                </div>
              )}
              <div>{preview}</div>
            </>
          ) : (
            <div>
              <div className="font-medium text-xs">
                {title}
              </div>
              <div className="text-xs opacity-75 mt-1">
                No preview available
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}