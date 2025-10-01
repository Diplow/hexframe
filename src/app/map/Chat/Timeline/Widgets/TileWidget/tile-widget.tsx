'use client';

import { useEffect, useState } from 'react';
import { TileHeader } from '~/app/map/Chat/Timeline/Widgets/TileWidget/TileHeader';
import { ContentDisplay } from '~/app/map/Chat/Timeline/Widgets/TileWidget/ContentDisplay';
import { TileForm } from '~/app/map/Chat/Timeline/Widgets/TileWidget/TileForm';
import { useTileState } from '~/app/map/Chat/Timeline/Widgets/TileWidget/useTileState';
import { BaseWidget } from '~/app/map/Chat/Timeline/Widgets/_shared';
import { useMapCache } from '~/app/map/Cache';
import { CoordSystem } from '~/lib/domains/mapping/utils';
import { getColor } from '~/app/map/types';

interface TileWidgetProps {
  mode?: 'view' | 'edit' | 'create';
  tileId?: string;
  coordId?: string;
  title?: string;
  preview?: string;
  content?: string;
  forceExpanded?: boolean;
  openInEditMode?: boolean;
  tileColor?: string;
  parentName?: string;
  parentCoordId?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onSave?: (title: string, preview: string, content: string) => void;
  onClose?: () => void;
}

export function TileWidget({
  mode = 'view',
  tileId,
  coordId,
  title = '',
  preview = '',
  content = '',
  forceExpanded,
  openInEditMode,
  tileColor: providedTileColor,
  parentName: _parentName,
  parentCoordId: _parentCoordId,
  onEdit,
  onDelete,
  onSave,
  onClose,
}: TileWidgetProps) {
  const { getItem, hasItem, isLoading } = useMapCache();
  const [showMetadata, setShowMetadata] = useState(false);

  // Calculate tile color for creation mode
  const tileColor = mode === 'create' && coordId
    ? getColor(CoordSystem.parseId(coordId))
    : providedTileColor;

  const { expansion, editing } = useTileState({
    title,
    preview,
    content,
    forceExpanded,
    openInEditMode: mode === 'create' ? true : openInEditMode,
    tileId: tileId ?? '',
  });

  const { isExpanded, setIsExpanded } = expansion;
  const {
    isEditing,
    setIsEditing,
    title: editTitle,
    setTitle: setEditTitle,
    preview: editPreview,
    setPreview: setEditPreview,
    content: editContent,
    setContent: setEditContent
  } = editing;

  // Auto-close widget if the previewed tile is deleted (only for view/edit modes)
  useEffect(() => {
    // Only check if cache is not loading to avoid false positives
    // Skip for creation mode since tile doesn't exist yet
    if (!isLoading && onClose && mode !== 'create' && tileId) {
      const tile = getItem(tileId);
      const tileExists = hasItem(tileId);

      // Close widget if:
      // 1. Cache has the tile's region loaded but tile doesn't exist (deleted)
      // 2. Or we have no tile and hasItem returns false (confirmed deleted)
      if (!tile && !tileExists) {
        onClose();
      }
    }
  }, [tileId, getItem, hasItem, isLoading, onClose, mode]);

  const _handleEdit = () => {
    setIsEditing(true);
    setIsExpanded(true);
  };

  const _handleSave = () => {
    if (onSave) {
      onSave(editTitle, editPreview, editContent);
    }
    if (mode !== 'create') {
      setIsEditing(false);
    }
  };

  const _handleCancel = () => {
    if (mode === 'create') {
      onClose?.();
    } else {
      setEditTitle(title);
      setEditPreview(preview);
      setEditContent(content);
      setIsEditing(false);
    }
  };

  const _handleShowMetadata = () => {
    if (!tileId) return;
    const tile = getItem(tileId);
    if (tile) {
      const metadataText = `Tile Metadata:
- Database ID: ${tile.metadata.dbId}
- Coordinate ID: ${tile.metadata.coordId}
- Owner ID: ${tile.metadata.ownerId}`;

      // Copy to clipboard and show a temporary indicator
      void navigator.clipboard.writeText(metadataText).then(() => {
        setShowMetadata(true);
        setTimeout(() => setShowMetadata(false), 2000);
      });
    }
  };

  const _handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to preview field
      const previewTextarea = document.querySelector<HTMLTextAreaElement>('[data-field="preview"]');
      previewTextarea?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      _handleCancel();
    }
  };

  return (
    <BaseWidget
      testId={mode === 'create' ? 'creation-widget' : 'tile-widget'}
      className="flex-1 w-full relative"
    >
      <TileHeader
        tileId={tileId}
        coordId={coordId}
        mode={mode}
        title={title}
        isExpanded={isExpanded}
        isEditing={isEditing}
        editTitle={editTitle}
        hasContent={!!content}
        tileColor={tileColor}
        onToggleExpansion={() => setIsExpanded(!isExpanded)}
        onTitleChange={setEditTitle}
        onTitleKeyDown={_handleTitleKeyDown}
        onEdit={onEdit ? _handleEdit : undefined}
        onDelete={mode !== 'create' ? onDelete : undefined}
        onClose={onClose}
        onMetadata={mode !== 'create' ? _handleShowMetadata : undefined}
        onSave={_handleSave}
        onCancel={_handleCancel}
      />

      {/* Show form when editing or creating */}
      {(isEditing || mode === 'create') && (
        <TileForm
          mode={mode === 'create' ? 'create' : 'edit'}
          preview={editPreview}
          content={editContent}
          onPreviewChange={setEditPreview}
          onContentChange={setEditContent}
          onSave={_handleSave}
          onCancel={_handleCancel}
        />
      )}

      {/* Show content display only in view mode */}
      {mode !== 'create' && !isEditing && (
        <ContentDisplay
          content={content}
          preview={preview}
          isExpanded={isExpanded}
          onToggleExpansion={() => setIsExpanded(!isExpanded)}
        />
      )}

      {showMetadata && (
        <div className="absolute top-2 right-2 bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-800 px-2 py-1 rounded text-xs z-10">
          Metadata copied to clipboard!
        </div>
      )}
    </BaseWidget>
  );
}