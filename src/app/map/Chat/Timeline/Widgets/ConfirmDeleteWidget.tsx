'use client';

import { useState } from 'react';
import { useMapCache } from '~/app/map/Cache';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useEventBus } from '~/app/map/Services';
import { Button } from '~/components/ui/button';
import { BaseWidget, WidgetHeader, WidgetContent, WidgetActions } from '~/app/map/Chat/Timeline/Widgets/_shared';

interface ConfirmDeleteWidgetProps {
  tileId: string;
  tileName: string;
  widgetId?: string; // Add widget ID to ensure proper resolution
}

export function ConfirmDeleteWidget({ tileId, tileName, widgetId: _widgetId }: ConfirmDeleteWidgetProps) {
  const { deleteItemOptimistic } = useMapCache();
  const eventBus = useEventBus();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');

    try {
      await deleteItemOptimistic(tileId);
      
      // Send tile deleted event
      eventBus.emit({
        type: 'map.tile_deleted',
        payload: {
          tileId: tileId,
          tileName: tileName,
          coordId: tileId // tileId is actually the coordId in this context
        },
        source: 'map_cache', // Must be map_cache for this event type
        timestamp: new Date(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tile');
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    // Emit a fake tile_deleted event to trigger operation_completed
    // This will close the delete widget
    eventBus.emit({
      type: 'map.tile_deleted',
      payload: {
        tileId: tileId,
        tileName: '(cancelled)',
        coordId: tileId // tileId is actually the coordId in this context
      },
      source: 'map_cache', // Must be map_cache for this event type
      timestamp: new Date(),
    });
  };

  return (
    <BaseWidget variant="destructive" className="w-full max-w-md mx-auto">
      <WidgetHeader
        icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
        title="Delete Tile?"
        subtitle={`Delete "${tileName || 'this tile'}"? This action cannot be undone.`}
      />

      <WidgetContent>
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
            onClick={handleDelete}
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