'use client';

import { useState } from 'react';
import { useMapCache } from '../../Cache/_hooks/use-map-cache';
import { useChatCacheOperations } from '../Cache/hooks/useChatCacheOperations';
import { Trash2, AlertTriangle } from 'lucide-react';

interface ConfirmDeleteWidgetProps {
  tileId: string;
  tileName: string;
}

export function ConfirmDeleteWidget({ tileId, tileName }: ConfirmDeleteWidgetProps) {
  const { deleteItemOptimistic } = useMapCache();
  const { dispatch } = useChatCacheOperations();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');

    try {
      await deleteItemOptimistic(tileId);
      
      // Remove the confirmation widget and notify about deletion
      dispatch({
        type: 'widget_resolved',
        payload: {
          widgetId: `confirm-delete-${tileId}`,
          action: 'confirmed'
        },
        id: `widget-resolved-${Date.now()}`,
        timestamp: new Date(),
        actor: 'user',
      });
      
      // Send operation completed event
      dispatch({
        type: 'operation_completed',
        payload: {
          operation: 'delete',
          tileId,
          result: 'success',
          message: `Deleted tile "${tileName}"`
        },
        id: `tile-deleted-${Date.now()}`,
        timestamp: new Date(),
        actor: 'user',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tile');
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    dispatch({
      type: 'widget_resolved',
      payload: {
        widgetId: `confirm-delete-${tileId}`,
        action: 'cancelled'
      },
      id: `widget-resolved-${Date.now()}`,
      timestamp: new Date(),
      actor: 'user',
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