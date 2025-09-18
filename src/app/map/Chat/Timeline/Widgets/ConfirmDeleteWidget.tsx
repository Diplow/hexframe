'use client';

import { useState } from 'react';
import { useMapCache } from '~/app/map/Cache';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { BaseWidget, WidgetHeader, WidgetContent, WidgetActions } from '~/app/map/Chat/Timeline/Widgets/_shared';

interface ConfirmDeleteWidgetProps {
  tileId: string;
  tileName: string;
  widgetId?: string; // Add widget ID to ensure proper resolution
  onClose?: () => void;
}

export function ConfirmDeleteWidget({ tileId, tileName, widgetId: _widgetId, onClose }: ConfirmDeleteWidgetProps) {
  const { deleteItemOptimistic } = useMapCache();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');

    try {
      await deleteItemOptimistic(tileId);
      // The mutation handler already emits map.tile_deleted event
      onClose?.(); // Close widget on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tile');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    onClose?.();
  };

  return (
    <BaseWidget variant="default" className="w-full">
      <WidgetHeader
        icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
        title="Delete Tile?"
        onClose={onClose}
      />

      <WidgetContent>
        <div className="space-y-3">
          <p className="text-sm">
            Delete &ldquo;{tileName || 'this tile'}&rdquo;? This action cannot be undone.
          </p>

          {tileId?.includes(':') && (tileId.split(':')[1]?.length ?? 0) > 0 && (
            <p className="text-sm text-muted-foreground">
              All child tiles will also be deleted.
            </p>
          )}

          {error && (
            <div className="text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <WidgetActions align="between">
          <Button
            onClick={handleCancel}
            disabled={isDeleting}
            variant="outline"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleDelete()}
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