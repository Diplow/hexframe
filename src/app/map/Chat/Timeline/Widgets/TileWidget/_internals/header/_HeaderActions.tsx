'use client';

import { Check, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { ActionMenu } from '~/app/map/Chat/Timeline/Widgets/TileWidget/ActionMenu';

interface HeaderActionsProps {
  mode: 'view' | 'edit' | 'create' | 'history';
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  onMetadata?: () => void;
  onHistory?: () => void;
}

export function _HeaderActions({
  mode,
  isEditing,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  onClose,
  onMetadata,
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
      onEdit={onEdit}
      onDelete={onDelete}
      onClose={onClose}
      onMetadata={onMetadata}
      onHistory={onHistory}
    />
  );
}
