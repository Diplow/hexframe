'use client';

import { cn } from '~/lib/utils';

export interface FavoriteItemSkeletonProps {
  favoriteId: string;
  shortcutName: string;
  disabled?: boolean;
}

/**
 * Loading skeleton for a favorite list item.
 */
export function FavoriteItemSkeleton({
  favoriteId,
  shortcutName,
  disabled = false,
}: FavoriteItemSkeletonProps) {
  return (
    <li
      data-testid={`favorite-item-${favoriteId}`}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2 rounded-md',
        disabled && 'opacity-50'
      )}
      data-disabled={disabled || undefined}
      aria-label={`Favorite: ${shortcutName}`}
    >
      <div
        data-testid="favorite-item-skeleton"
        className="flex flex-col gap-1 flex-1"
      >
        <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        <div className="h-3 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </div>
    </li>
  );
}
