'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '~/components/ui/button';

export interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

/**
 * Error state display with retry button.
 */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="px-3 py-4">
      <p className="text-sm text-destructive mb-2">{error}</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="w-full">
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>
  );
}

/**
 * Loading state with skeleton items.
 */
export function LoadingState() {
  return (
    <div data-testid="favorites-loading" className="px-3 py-4 space-y-2">
      {[1, 2, 3].map((skeletonIndex) => (
        <div key={skeletonIndex} className="flex flex-col gap-1 animate-pulse">
          <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
          <div className="h-3 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state when user has no favorites.
 */
export function EmptyState() {
  return (
    <div className="px-3 py-4 text-center">
      <p className="text-sm text-muted-foreground">No favorites yet</p>
      <p className="text-xs text-muted-foreground mt-1">
        Right-click on a tile to add it to favorites
      </p>
    </div>
  );
}

/**
 * No results state when search yields no matches.
 */
export function NoResultsState() {
  return (
    <div className="px-3 py-4 text-center">
      <p className="text-sm text-muted-foreground">
        No matching favorites found
      </p>
    </div>
  );
}
