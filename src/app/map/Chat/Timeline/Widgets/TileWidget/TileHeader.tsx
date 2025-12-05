'use client';

import { cn } from '~/lib/utils';
import { _TilePreviewSection } from '~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/header/_TilePreview';
import { _TitleSection } from '~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/header/_TitleSection';
import { _HeaderActions } from '~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/header/_HeaderActions';
import type { Visibility } from '~/lib/domains/mapping/utils';

interface TileHeaderProps {
  tileId?: string;
  coordId?: string;
  mode?: 'view' | 'edit' | 'create' | 'history';
  title: string | React.ReactNode;
  isExpanded: boolean;
  isEditing: boolean;
  editTitle: string;
  hasContent: boolean;
  tileColor?: string;
  visibility?: Visibility;
  onToggleExpansion: () => void;
  onTitleChange: (title: string) => void;
  onTitleKeyDown: (e: React.KeyboardEvent) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDeleteChildren?: () => void;
  onDeleteComposed?: () => void;
  onDeleteExecutionHistory?: () => void;
  onToggleVisibility?: () => void;
  onClose?: () => void;
  onCopyCoordinates?: () => void;
  onHistory?: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function TileHeader({
  tileId,
  coordId: _coordId,
  mode = 'view',
  title,
  isExpanded,
  isEditing,
  editTitle,
  hasContent,
  tileColor,
  visibility,
  onToggleExpansion,
  onTitleChange,
  onTitleKeyDown,
  onEdit,
  onDelete,
  onDeleteChildren,
  onDeleteComposed,
  onDeleteExecutionHistory,
  onToggleVisibility,
  onClose,
  onCopyCoordinates,
  onHistory,
  onSave,
  onCancel,
}: TileHeaderProps) {
  // Show border when there's any content below (preview or expanded content)
  // In creation mode, always show border since form is always visible
  const borderClass = (mode === 'create' || hasContent) ? 'border-b border-neutral-200 dark:border-neutral-800' : '';
  const isTogglable = hasContent && !isEditing && mode !== 'create';

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
      <_TilePreviewSection
        mode={mode}
        tileId={tileId}
        tileColor={tileColor}
        isTogglable={isTogglable}
      />

      <_TitleSection
        mode={mode}
        isEditing={isEditing}
        title={title}
        editTitle={editTitle}
        onTitleChange={onTitleChange}
        onTitleKeyDown={onTitleKeyDown}
      />

      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <_HeaderActions
          mode={mode}
          isEditing={isEditing}
          visibility={visibility}
          onSave={onSave}
          onCancel={onCancel}
          onEdit={onEdit}
          onDelete={onDelete}
          onDeleteChildren={onDeleteChildren}
          onDeleteComposed={onDeleteComposed}
          onDeleteExecutionHistory={onDeleteExecutionHistory}
          onToggleVisibility={onToggleVisibility}
          onClose={onClose}
          onCopyCoordinates={onCopyCoordinates}
          onHistory={onHistory}
        />
      </div>
    </div>
  );
}