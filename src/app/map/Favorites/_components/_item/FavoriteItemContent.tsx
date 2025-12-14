'use client';

import type { MouseEvent } from 'react';

export interface FavoriteItemContentProps {
  shortcutName: string;
  displayTitle?: string;
  displayPreview?: string;
  previewId: string;
  /** Click handler for the @shortcut (to insert into chat) */
  onShortcutClick?: (event: MouseEvent) => void;
  /** Click handler for the content area (title/preview) to navigate */
  onContentClick?: () => void;
}

/**
 * Content section of a favorite list item showing shortcut, title, and preview.
 *
 * Display logic:
 * - Always shows @shortcutName as the primary identifier (clickable to insert into chat)
 * - Shows tile title only if it differs from shortcutName
 * - Shows preview as secondary text if available
 * - Title/preview area is clickable to navigate to the tile
 */
export function FavoriteItemContent({
  shortcutName,
  displayTitle,
  displayPreview,
  previewId,
  onShortcutClick,
  onContentClick,
}: FavoriteItemContentProps) {
  // Only show title if it's different from the shortcut name
  const showTitle = displayTitle && displayTitle !== shortcutName;

  return (
    <div className="flex flex-col flex-1 min-w-0 gap-0.5">
      {/* Clickable @shortcut - inserts into chat */}
      <button
        type="button"
        onClick={onShortcutClick}
        className="text-sm font-medium text-primary hover:text-primary/80 hover:underline cursor-pointer text-left w-fit transition-colors"
        aria-label={`Insert @${shortcutName} into chat`}
      >
        @{shortcutName}
      </button>

      {/* Clickable content area - navigates to tile */}
      {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Using || for boolean OR logic */}
      {(showTitle || displayPreview) && (
        <button
          type="button"
          onClick={onContentClick}
          className="flex flex-col text-left cursor-pointer rounded transition-colors"
          aria-label="Navigate to tile"
        >
          {showTitle && (
            <span className="text-sm text-foreground truncate">{displayTitle}</span>
          )}
          {displayPreview && (
            <span
              id={previewId}
              data-testid="favorite-item-preview"
              className="text-xs text-muted-foreground truncate"
            >
              {displayPreview}
            </span>
          )}
        </button>
      )}

      {/* Hidden preview for accessibility when no preview available */}
      {!displayPreview && (
        <span
          id={previewId}
          data-testid="favorite-item-preview"
          className="sr-only"
        >
          No preview available
        </span>
      )}
    </div>
  );
}
