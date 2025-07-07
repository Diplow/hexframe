import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '~/components/ui/button';
import type { ConfirmDeleteWidgetProps } from '../_base/widget.types';
import { WidgetContainer } from '../_base/WidgetContainer';

/**
 * ConfirmDeleteWidget - Deletion confirmation dialog
 * This is a Canvas widget that modifies the map by deleting tiles
 */
export function ConfirmDeleteWidget({
  id,
  itemName,
  tile,
  onTileDelete,
  onConfirm,
  onCancel,
  onClose,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDangerous = true,
  isExpanded,
  isLoading,
  error,
  timestamp,
  priority = 'critical',
}: ConfirmDeleteWidgetProps) {
  const handleConfirm = async () => {
    void onConfirm();
    if (onTileDelete && tile) {
      await onTileDelete(tile.id);
    }
  };

  const handleCancel = () => {
    onCancel();
    onClose?.();
  };

  return (
    <WidgetContainer
      id={id}
      onClose={onClose}
      isExpanded={isExpanded}
      isLoading={isLoading}
      error={error}
      timestamp={timestamp}
      priority={priority}
      isCanvasOperation
      className="confirm-delete-widget"
    >
      <div className="space-y-4">
        {/* Warning icon and message */}
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-neutral-900">
              Are you sure you want to delete &ldquo;{itemName}&rdquo;?
            </p>
            <p className="text-xs text-muted-foreground">
              This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2">
          <Button
            onClick={handleCancel}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            variant={isDangerous ? 'destructive' : 'default'}
            size="sm"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </WidgetContainer>
  );
}