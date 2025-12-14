'use client';

import { Button } from '~/components/ui/button';

export interface FavoritesConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation dialog for removing a favorite.
 */
export function FavoritesConfirmDialog({
  onConfirm,
  onCancel,
}: FavoritesConfirmDialogProps) {
  return (
    <div className="px-3 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
      <p className="text-sm text-muted-foreground mb-2">
        Are you sure you want to remove this favorite?
      </p>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={onConfirm}
          className="flex-1"
        >
          Remove
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
