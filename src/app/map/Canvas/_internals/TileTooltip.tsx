'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '~/lib/utils';

interface TileTooltipProps {
  children: React.ReactNode;
  preview?: string;
  title?: string;
  disabled?: boolean;
}

/** Calculate tooltip position within viewport bounds */
function _calculatePosition(mouseX: number, mouseY: number, tooltipRect: DOMRect) {
  const offset = 12;
  let x = mouseX + offset;
  let y = mouseY + offset;

  // Keep within viewport
  if (x + tooltipRect.width > window.innerWidth - 8) x = mouseX - tooltipRect.width - offset;
  if (x < 8) x = 8;
  if (y + tooltipRect.height > window.innerHeight - 8) y = mouseY - tooltipRect.height - offset;
  if (y < 8) y = 8;

  return { x, y };
}

/** Render tooltip content based on preview/title availability */
function _TooltipContent({ preview, title }: { preview?: string; title?: string }) {
  if (preview) {
    return (
      <>
        {title && <div className="font-medium mb-1 text-xs opacity-75">{title}</div>}
        <div>{preview}</div>
      </>
    );
  }
  return (
    <div>
      <div className="font-medium text-xs">{title}</div>
      <div className="text-xs opacity-75 mt-1">No preview available</div>
    </div>
  );
}

export function TileTooltip({ children, preview, title, disabled }: TileTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const shouldShowTooltip = !disabled && ((preview?.trim().length ?? 0) > 0 || (!preview && title));

  const updatePosition = useCallback((mouseX: number, mouseY: number) => {
    if (!tooltipRef.current) return;
    setPosition(_calculatePosition(mouseX, mouseY, tooltipRef.current.getBoundingClientRect()));
  }, []);

  useEffect(() => {
    if (isVisible && tooltipRef.current) updatePosition(lastMousePos.x, lastMousePos.y);
  }, [isVisible, lastMousePos, updatePosition]);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (shouldShowTooltip) { setLastMousePos({ x: e.clientX, y: e.clientY }); setIsVisible(true); }
  }, [shouldShowTooltip]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (shouldShowTooltip) {
      setLastMousePos({ x: e.clientX, y: e.clientY });
      if (isVisible) updatePosition(e.clientX, e.clientY);
    }
  }, [shouldShowTooltip, isVisible, updatePosition]);

  const tooltipContent = isVisible && shouldShowTooltip && (
    <div
      ref={tooltipRef}
      className={cn(
        "fixed z-[9999] px-3 py-2 max-w-xs dark:bg-neutral-900 bg-neutral-100",
        "dark:text-white text-neutral-900 text-sm rounded-md shadow-lg",
        "border dark:border-neutral-700 border-neutral-300 pointer-events-none"
      )}
      style={{ left: position.x, top: position.y }}
    >
      <_TooltipContent preview={preview} title={title} />
    </div>
  );

  return (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setIsVisible(false)}
        className="relative"
        style={{ width: "100%", height: "100%" }}
      >
        {children}
      </div>
      {typeof document !== 'undefined' && tooltipContent && createPortal(tooltipContent, document.body)}
    </>
  );
}