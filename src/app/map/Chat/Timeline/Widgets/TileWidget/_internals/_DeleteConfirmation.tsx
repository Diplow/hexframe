'use client';

import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { BaseWidget, WidgetHeader, WidgetContent, WidgetActions } from '~/app/map/Chat/Timeline/Widgets/_shared';

interface DeleteConfirmationProps {
  title: string;
  tileId?: string;
  coordId?: string;
  isDeleting: boolean;
  deleteError: string;
  onCancel: () => void;
  onConfirmDelete: () => void;
}

export function _DeleteConfirmation({
  title,
  tileId,
  coordId,
  isDeleting,
  deleteError,
  onCancel,
  onConfirmDelete,
}: DeleteConfirmationProps) {
  const hasChildren = Boolean(tileId?.includes(':') && (tileId.split(':')[1]?.length ?? 0) > 0) ||
    Boolean(coordId?.includes(':') && (coordId.split(':')[1]?.length ?? 0) > 0);

  return (
    <BaseWidget variant="default" className="w-full">
      <WidgetHeader
        icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
        title="Delete Tile?"
        onClose={onCancel}
      />

      <WidgetContent>
        <div className="space-y-3">
          <p className="text-sm">
            Delete &ldquo;{title || 'this tile'}&rdquo;? This action cannot be undone.
          </p>

          {hasChildren && (
            <p className="text-sm text-muted-foreground">
              All child tiles will also be deleted.
            </p>
          )}

          {deleteError && (
            <div className="text-sm text-destructive">
              {deleteError}
            </div>
          )}
        </div>

        <WidgetActions align="between">
          <Button
            onClick={onCancel}
            disabled={isDeleting}
            variant="outline"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirmDelete}
            disabled={isDeleting}
            variant="destructive"
            size="sm"
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </WidgetActions>
      </WidgetContent>
    </BaseWidget>
  );
}
