'use client';

import { useState } from 'react';
import { useMapCache } from '../../Cache/_hooks/use-map-cache';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useEventBus } from '../../Services/EventBus/event-bus-context';

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
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-destructive-50 dark:bg-destructive-900/20 rounded-lg p-4 border border-destructive-200 dark:border-destructive-800">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-destructive-100 dark:bg-destructive-900/30 rounded-full">
            <AlertTriangle className="h-5 w-5 text-destructive-600 dark:text-destructive-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-destructive-900 dark:text-destructive-100 mb-2">
              Delete Tile?
            </h3>
            <p className="text-sm text-destructive-700 dark:text-destructive-300 mb-4">
              Are you sure you want to delete <strong>{tileName || 'this tile'}</strong>? This action cannot be undone.
              {tileId?.includes(':') && (tileId.split(':')[1]?.length ?? 0) > 0 && (
                <span className="block mt-2 text-xs">
                  All child tiles will also be deleted.
                </span>
              )}
            </p>

            {error && (
              <div className="mb-3 text-sm text-destructive-600 dark:text-destructive-400">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium 
                         text-white bg-destructive-600 rounded-md hover:bg-destructive-700 
                         focus:outline-none focus:ring-2 focus:ring-destructive-500 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isDeleting}
                className="flex-1 py-2 px-4 text-sm font-medium text-destructive-700 dark:text-destructive-300 
                         bg-white dark:bg-neutral-800 border border-destructive-300 dark:border-destructive-700 
                         rounded-md hover:bg-destructive-50 dark:hover:bg-neutral-700 
                         focus:outline-none focus:ring-2 focus:ring-destructive-500 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}