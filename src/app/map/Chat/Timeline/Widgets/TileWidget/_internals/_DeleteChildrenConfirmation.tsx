'use client';

import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { BaseWidget, WidgetHeader, WidgetContent, WidgetActions } from '~/app/map/Chat/Timeline/Widgets/_shared';

interface DeleteChildrenConfirmationProps {
  title: string;
  tileId?: string;
  coordId?: string;
  directionType: 'structural' | 'composed' | 'executionHistory';
  isDeleting: boolean;
  deleteError: string;
  onCancel: () => void;
  onConfirmDelete: () => void;
}

function _getDirectionTypeLabel(directionType: 'structural' | 'composed' | 'executionHistory'): string {
  switch (directionType) {
    case 'structural':
      return 'children';
    case 'composed':
      return 'composed children';
    case 'executionHistory':
      return 'execution history';
  }
}

function _getDirectionTypeDescription(directionType: 'structural' | 'composed' | 'executionHistory'): string {
  switch (directionType) {
    case 'structural':
      return 'All structural children (directions 1-6) and their descendants will be deleted.';
    case 'composed':
      return 'All composed children (directions -1 to -6) and their descendants will be deleted.';
    case 'executionHistory':
      return 'The execution history (direction 0) and its descendants will be deleted.';
  }
}

export function _DeleteChildrenConfirmation({
  title,
  directionType,
  isDeleting,
  deleteError,
  onCancel,
  onConfirmDelete,
}: DeleteChildrenConfirmationProps) {
  const directionLabel = _getDirectionTypeLabel(directionType);
  const description = _getDirectionTypeDescription(directionType);

  return (
    <BaseWidget variant="default" className="w-full">
      <WidgetHeader
        icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
        title={`Delete ${directionLabel}?`}
        onClose={onCancel}
      />

      <WidgetContent>
        <div className="space-y-3">
          <p className="text-sm">
            Delete all {directionLabel} of &ldquo;{title || 'this tile'}&rdquo;?
          </p>

          <p className="text-sm text-muted-foreground">
            {description}
          </p>

          <p className="text-sm text-destructive font-medium">
            This action cannot be undone.
          </p>

          {deleteError && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
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
            {isDeleting ? 'Deleting...' : `Delete ${directionLabel}`}
          </Button>
        </WidgetActions>
      </WidgetContent>
    </BaseWidget>
  );
}
