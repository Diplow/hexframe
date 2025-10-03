'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Show tooltip if we have preview text and not disabled
  // Also show for testing if title is provided but no preview (temporary)
  const shouldShowTooltip = !disabled && ((preview?.trim().length ?? 0) > 0 || (!preview && title));

  // Update position after tooltip renders
  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      updateTooltipPosition(lastMousePos.x, lastMousePos.y);
    }
  }, [isVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateTooltipPosition = (mouseX: number, mouseY: number) => {
    if (!tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();

    // Offset from cursor to avoid tooltip overlapping with cursor
    const offsetX = 12;
    const offsetY = 12;

    // Position tooltip to the right and below cursor
    let x = mouseX + offsetX;
    let y = mouseY + offsetY;

    // Keep tooltip within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust horizontal position if tooltip would overflow viewport
    if (x + tooltipRect.width > viewportWidth - 8) {
      x = mouseX - tooltipRect.width - offsetX; // Show to the left
    }
    if (x < 8) x = 8;

    // Adjust vertical position if tooltip would overflow viewport
    if (y + tooltipRect.height > viewportHeight - 8) {
      y = mouseY - tooltipRect.height - offsetY; // Show above
    }
    if (y < 8) y = 8;

    setPosition({ x, y });
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (shouldShowTooltip) {
      setLastMousePos({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (shouldShowTooltip) {
      setLastMousePos({ x: e.clientX, y: e.clientY });
      if (isVisible) {
        updateTooltipPosition(e.clientX, e.clientY);
      }
    }
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const tooltipContent = isVisible && shouldShowTooltip && (
    <div
      ref={tooltipRef}
      className={cn(
        "fixed z-[9999] px-3 py-2 max-w-xs",
        "dark:bg-neutral-900 bg-neutral-100",
        "dark:text-white text-neutral-900",
        "text-sm rounded-md shadow-lg",
        "border dark:border-neutral-700 border-neutral-300",
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
  );

  return (
    <>
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative"
        style={{ width: "100%", height: "100%" }}
      >
        {children}
      </div>

      {/* Render tooltip in a portal at document body to escape transform contexts */}
      {typeof document !== 'undefined' && tooltipContent && createPortal(tooltipContent, document.body)}
    </>
  );
}