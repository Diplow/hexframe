'use client';

import { cn } from '~/lib/utils';
import { ActionMenu } from '~/app/map/Chat/Timeline/Widgets/PreviewWidget/ActionMenu';
import { EditControls } from '~/app/map/Chat/Timeline/Widgets/PreviewWidget/EditControls';
import { BaseTileLayout } from '~/app/map/Canvas/Tile/Base/BaseTileLayout';

interface PreviewHeaderProps {
  title: string;
  isExpanded: boolean;
  isEditing: boolean;
  editTitle: string;
  hasContent: boolean;
  tileColor?: string;
  onToggleExpansion: () => void;
  onTitleChange: (title: string) => void;
  onTitleKeyDown: (e: React.KeyboardEvent) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function PreviewHeader({
  title,
  isExpanded,
  isEditing,
  editTitle,
  hasContent,
  tileColor,
  onToggleExpansion,
  onTitleChange,
  onTitleKeyDown,
  onEdit,
  onDelete,
  onClose,
  onSave,
  onCancel,
}: PreviewHeaderProps) {
  // Only show border when content is expanded - matches other widgets
  const borderClass = isExpanded ? 'border-b border-neutral-200 dark:border-neutral-800' : '';

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3",
        "cursor-pointer hover:bg-muted/50 active:bg-muted/70 transition-colors",
        "focus:outline-none focus:bg-muted/50",
        borderClass
      )}
      onClick={() => hasContent && !isEditing && onToggleExpansion()}
    >
      {/* Tile preview on the left */}
      <div className="flex-shrink-0">
        <BaseTileLayout
          coordId="preview-0,0"
          scale={1}
          color={tileColor}
          baseHexSize={10}
          cursor="cursor-pointer"
        />
      </div>

      {/* Title or edit input */}
      {isEditing ? (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={onTitleKeyDown}
          className="flex-1 text-sm font-semibold bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">
            {title}
          </div>
        </div>
      )}

      {/* Actions on the right */}
      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {isEditing ? (
          <EditControls onSave={onSave} onCancel={onCancel} />
        ) : (
          <ActionMenu
            onEdit={onEdit}
            onDelete={onDelete}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}