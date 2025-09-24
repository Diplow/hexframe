'use client';

import { cn } from '~/lib/utils';
import { ActionMenu } from '~/app/map/Chat/Timeline/Widgets/PreviewWidget/ActionMenu';
import { EditControls } from '~/app/map/Chat/Timeline/Widgets/PreviewWidget/EditControls';
import { DraggableTilePreview } from '~/app/map/Chat/Timeline/Widgets/_shared';

interface PreviewHeaderProps {
  tileId: string;
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
  onMetadata?: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function PreviewHeader({
  tileId,
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
  onMetadata,
  onSave,
  onCancel,
}: PreviewHeaderProps) {
  // Only show border when content is expanded - matches other widgets
  const borderClass = isExpanded ? 'border-b border-neutral-200 dark:border-neutral-800' : '';
  const isTogglable = hasContent && !isEditing;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') && isTogglable) {
      e.preventDefault();
      onToggleExpansion();
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 transition-colors",
        isTogglable && "cursor-pointer hover:bg-muted/50 active:bg-muted/70 focus:bg-muted/50",
        !isTogglable && "cursor-default",
        "focus:outline-none",
        borderClass
      )}
      role={isTogglable ? "button" : undefined}
      tabIndex={isTogglable ? 0 : -1}
      aria-expanded={isTogglable ? isExpanded : undefined}
      aria-controls={isTogglable ? "preview-content" : undefined}
      aria-disabled={!isTogglable}
      onClick={() => isTogglable && onToggleExpansion()}
      onKeyDown={handleKeyDown}
    >
      {/* Tile preview on the left */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <DraggableTilePreview
          tileId={tileId}
          tileColor={tileColor}
          size={10}
          className="flex-shrink-0"
          cursor={isTogglable ? "cursor-pointer" : undefined}
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
            onMetadata={onMetadata}
          />
        )}
      </div>
    </div>
  );
}