'use client';

import { useCallback, useState } from 'react';
import { StarOff, Pencil } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { FavoriteItemContent } from '~/app/map/Favorites/_components/_item/FavoriteItemContent';
import { FavoriteItemSkeleton } from '~/app/map/Favorites/_components/_item/FavoriteItemSkeleton';
import { ShortcutEditor } from '~/app/map/Favorites/_components/_item/ShortcutEditor';
import type { Favorite } from '~/lib/domains/iam';

/**
 * Tile data associated with a favorite.
 * Retrieved from the map cache to enrich the favorite display.
 */
export interface FavoriteTileData {
  /** The tile's title (may differ from shortcut name) */
  title?: string;
  /** Short preview/description of the tile content */
  preview?: string;
}

/**
 * Props for the FavoriteListItem component.
 */
export interface FavoriteListItemProps {
  /** The favorite object containing id, shortcutName, mapItemId, etc. */
  favorite: Favorite;
  /** Optional tile data to display alongside the shortcut name */
  tileData?: FavoriteTileData;
  /** Whether this item is currently selected/highlighted */
  isSelected?: boolean;
  /** Whether the item is in a loading state (shows skeleton) */
  isLoading?: boolean;
  /** Whether interactions are disabled */
  disabled?: boolean;
  /** Whether to show the remove button (default: true) */
  showRemoveButton?: boolean;
  /** Whether to show the edit shortcut button (default: true) */
  showEditButton?: boolean;
  /** Callback when the item is clicked (receives mapItemId for navigation) */
  onClick?: (mapItemId: string) => void;
  /** Callback when the remove button is clicked (receives favoriteId) */
  onRemove?: (favoriteId: string) => void;
  /** Callback when shortcut is saved (receives favoriteId and newShortcutName) */
  onSaveShortcut?: (favoriteId: string, newShortcutName: string) => Promise<void>;
  /** Whether a shortcut save is in progress */
  isSavingShortcut?: boolean;
  /** Error message from shortcut save attempt */
  shortcutSaveError?: string;
  /** Callback when the @ shortcut is clicked (to insert into chat input) */
  onShortcutClick?: (shortcutName: string) => void;
}

/**
 * FavoriteListItem - Individual list item displaying a favorited tile.
 *
 * Displays:
 * - Clickable @shortcut name that inserts into chat input (or inline editor when editing)
 * - Tile title (if available and different from shortcut)
 * - Tile preview (truncated, if available)
 * - Edit button to modify the shortcut name (shows inline editor)
 * - Remove button to unfavorite
 *
 * Interaction design:
 * - Individual buttons have hover feedback (not the whole entry)
 * - @shortcut is clickable to insert into chat
 * - Title/preview click navigates to the tile
 * - Edit button replaces @shortcut with inline input + save/cancel buttons
 *
 * @example
 * ```tsx
 * <FavoriteListItem
 *   favorite={favorite}
 *   tileData={{ title: 'My Project', preview: 'Project description...' }}
 *   onClick={(mapItemId) => navigate(mapItemId)}
 *   onRemove={(favoriteId) => removeFavorite(favoriteId)}
 *   onSaveShortcut={async (id, name) => await updateShortcut(id, name)}
 *   onShortcutClick={(name) => insertIntoChat(`@${name}`)}
 * />
 * ```
 */
export function FavoriteListItem({
  favorite, tileData, isSelected = false, isLoading = false, disabled = false,
  showRemoveButton = true, showEditButton = true, onClick, onRemove,
  onSaveShortcut, isSavingShortcut = false, shortcutSaveError, onShortcutClick,
}: FavoriteListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const previewId = `favorite-preview-${favorite.id}`;

  const handleContentClick = useCallback(() => {
    if (disabled || isLoading || isEditing) return;
    onClick?.(favorite.mapItemId);
  }, [disabled, isLoading, isEditing, onClick, favorite.mapItemId]);

  const handleRemoveClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (disabled || isLoading) return;
    onRemove?.(favorite.id);
  }, [onRemove, favorite.id, disabled, isLoading]);

  const handleEditClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (disabled || isLoading) return;
    setIsEditing(true);
  }, [disabled, isLoading]);

  const handleSaveShortcut = useCallback(async (newShortcutName: string) => {
    if (!onSaveShortcut) return;
    await onSaveShortcut(favorite.id, newShortcutName);
    setIsEditing(false);
  }, [onSaveShortcut, favorite.id]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleShortcutClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (disabled || isLoading) return;
    onShortcutClick?.(favorite.shortcutName);
  }, [onShortcutClick, favorite.shortcutName, disabled, isLoading]);

  if (isLoading) {
    return <FavoriteItemSkeleton favoriteId={favorite.id} shortcutName={favorite.shortcutName} disabled={disabled} />;
  }

  const showRemove = showRemoveButton && onRemove;
  const showEdit = showEditButton && onSaveShortcut && !isEditing;

  return (
    <li
      data-testid={`favorite-item-${favorite.id}`}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
        'hover:bg-neutral-100 dark:hover:bg-neutral-800',
        isSelected && 'selected bg-neutral-200 dark:bg-neutral-700',
        disabled && 'opacity-50'
      )}
      role="listitem"
      aria-label={`Favorite: ${favorite.shortcutName}`}
      aria-describedby={previewId}
      data-disabled={disabled || undefined}
    >
      {isEditing ? (
        <ShortcutEditor
          initialValue={favorite.shortcutName}
          onSave={handleSaveShortcut}
          onCancel={handleCancelEdit}
          isSaving={isSavingShortcut}
          error={shortcutSaveError}
        />
      ) : (
        <>
          <FavoriteItemContent
            shortcutName={favorite.shortcutName}
            displayTitle={tileData?.title}
            displayPreview={tileData?.preview}
            previewId={previewId}
            onShortcutClick={onShortcutClick ? handleShortcutClick : undefined}
            onContentClick={onClick ? handleContentClick : undefined}
          />
          <div className="flex items-center gap-1 shrink-0">
            {showEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-secondary hover:bg-secondary/10"
                onClick={handleEditClick}
                aria-label="Edit shortcut name"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {showRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={handleRemoveClick}
                aria-label="Remove from favorites"
              >
                <StarOff className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </>
      )}
    </li>
  );
}
