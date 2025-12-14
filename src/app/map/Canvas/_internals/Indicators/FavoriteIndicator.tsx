'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Star } from 'lucide-react';
import { cn } from '~/lib/utils';

/**
 * Props for the FavoriteIndicator component.
 */
interface FavoriteIndicatorProps {
  /** Whether the tile is marked as a favorite. If false or undefined, nothing renders. */
  isFavorited?: boolean;
  /** The shortcut name for quick navigation (displayed as @shortcutName in tooltip). */
  shortcutName?: string;
  /** The current zoom scale of the tile. Affects icon size and positioning. */
  scale: number;
}

/** Represents x/y coordinates for tooltip positioning. */
interface TooltipPosition { x: number; y: number }

/**
 * Calculates the optimal tooltip position to keep it within viewport bounds.
 * Positions tooltip below-right of cursor by default, flipping to opposite side
 * if it would overflow the viewport.
 *
 * @param mouseX - Current mouse X coordinate (clientX)
 * @param mouseY - Current mouse Y coordinate (clientY)
 * @param tooltipRect - Bounding rectangle of the tooltip element
 * @returns Calculated x/y position for the tooltip
 */
function _calculateTooltipPosition(
  mouseX: number,
  mouseY: number,
  tooltipRect: DOMRect
): TooltipPosition {
  const offset = 12;
  const margin = 8;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let x = mouseX + offset;
  let y = mouseY + offset;

  if (x + tooltipRect.width > viewportWidth - margin) x = mouseX - tooltipRect.width - offset;
  if (x < margin) x = margin;
  if (y + tooltipRect.height > viewportHeight - margin) y = mouseY - tooltipRect.height - offset;
  if (y < margin) y = margin;

  return { x, y };
}

/**
 * Internal tooltip component rendered via portal for proper z-index stacking.
 * Displays the shortcut name with @ prefix in a styled floating box.
 *
 * @param tooltipRef - Ref attached to tooltip element for position calculations
 * @param position - Current x/y position for the tooltip
 * @param title - Text to display in the tooltip (typically @shortcutName)
 */
function _FavoriteTooltip({ tooltipRef, position, title }: {
  tooltipRef: React.RefObject<HTMLDivElement>;
  position: TooltipPosition;
  title: string;
}) {
  return (
    <div
      ref={tooltipRef as React.LegacyRef<HTMLDivElement>}
      className={cn(
        "fixed z-[9999] px-3 py-2 max-w-xs text-sm rounded-md shadow-lg pointer-events-none",
        "dark:bg-neutral-900 bg-neutral-100 dark:text-white text-neutral-900",
        "border dark:border-neutral-700 border-neutral-300"
      )}
      style={{ left: position.x, top: position.y }}
    >
      <div className="font-medium text-xs">{title}</div>
    </div>
  );
}

/**
 * Displays a star icon indicator on tiles that are marked as favorites.
 * Shows a tooltip with the shortcut name (@shortcutName) on hover.
 *
 * The indicator is positioned at the bottom-center of the tile,
 * opposite to the visibility indicator which appears at top-center.
 *
 * @example
 * ```tsx
 * <FavoriteIndicator
 *   isFavorited={true}
 *   shortcutName="my_project"
 *   scale={2}
 * />
 * ```
 */
export function FavoriteIndicator({ isFavorited, shortcutName, scale }: FavoriteIndicatorProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  if (!isFavorited) return null;

  const iconSize = scale >= 2 ? 14 : 10;
  const tooltipTitle = shortcutName ? `@${shortcutName}` : 'Favorited';

  const updatePosition = (clientX: number, clientY: number) => {
    if (!tooltipRef.current) return;
    setTooltipPosition(_calculateTooltipPosition(clientX, clientY, tooltipRef.current.getBoundingClientRect()));
  };

  return (
    <>
      <div
        data-testid="favorite-indicator"
        className="absolute bottom-0 pointer-events-auto z-50"
        style={{
          left: `calc(50% - ${scale >= 2 ? 7 : 5}px)`,
          marginBottom: scale >= 2 ? 8 : 4,
        }}
        onMouseEnter={(e) => { setIsTooltipVisible(true); updatePosition(e.clientX, e.clientY); }}
        onMouseMove={(e) => { if (isTooltipVisible) updatePosition(e.clientX, e.clientY); }}
        onMouseLeave={() => setIsTooltipVisible(false)}
      >
        <Star size={iconSize} className="text-secondary-light fill-secondary-light cursor-help" />
      </div>
      {typeof document !== 'undefined' && isTooltipVisible && createPortal(
        <_FavoriteTooltip tooltipRef={tooltipRef} position={tooltipPosition} title={tooltipTitle} />,
        document.body
      )}
    </>
  );
}
