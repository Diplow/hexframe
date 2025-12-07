'use client';

import { Check, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { ActionMenu } from '~/app/map/Chat/Timeline/Widgets/TileWidget/ActionMenu';
import type { Visibility } from '~/lib/domains/mapping/utils';

interface HeaderActionsProps {
  mode: 'view' | 'edit' | 'create' | 'history';
  isEditing: boolean;
  visibility?: Visibility;
  onSave: () => void;
  onCancel: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDeleteChildren?: () => void;
  onDeleteComposed?: () => void;
  onDeleteExecutionHistory?: () => void;
  onSetVisibility?: (visibility: Visibility) => void;
  onSetVisibilityWithDescendants?: (visibility: Visibility) => void;
  onClose?: () => void;
  onCopyCoordinates?: () => void;
  onHistory?: () => void;
}

export function _HeaderActions({
  mode,
  isEditing,
  visibility,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  onDeleteChildren,
  onDeleteComposed,
  onDeleteExecutionHistory,
  onSetVisibility,
  onSetVisibilityWithDescendants,
  onClose,
  onCopyCoordinates,
  onHistory,
}: HeaderActionsProps) {

  if (isEditing || mode === 'create') {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          aria-label="Save"
          onClick={onSave}
        >
          <Check className="h-4 w-4 text-[color:var(--success-color-600)]" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          aria-label="Cancel"
          onClick={onCancel}
        >
          <X className="h-4 w-4 text-[color:var(--destructive-color-600)]" />
        </Button>
      </>
    );
  }

  return (
    <ActionMenu
      visibility={visibility}
      onEdit={onEdit}
      onDelete={onDelete}
      onDeleteChildren={onDeleteChildren}
      onDeleteComposed={onDeleteComposed}
      onDeleteExecutionHistory={onDeleteExecutionHistory}
      onSetVisibility={onSetVisibility}
      onSetVisibilityWithDescendants={onSetVisibilityWithDescendants}
      onClose={onClose}
      onCopyCoordinates={onCopyCoordinates}
      onHistory={onHistory}
    />
  );
}
