'use client';

import { useEffect, useState } from 'react';
import { PreviewHeader } from '~/app/map/Chat/Timeline/Widgets/PreviewWidget/PreviewHeader';
import { ContentDisplay } from '~/app/map/Chat/Timeline/Widgets/PreviewWidget/ContentDisplay';
import { usePreviewState } from '~/app/map/Chat/Timeline/Widgets/PreviewWidget/usePreviewState';
import { BaseWidget } from '~/app/map/Chat/Timeline/Widgets/_shared';
import { useMapCache } from '~/app/map/Cache';

interface PreviewWidgetProps {
  tileId: string;
  title: string;
  content: string;
  forceExpanded?: boolean;
  openInEditMode?: boolean;
  tileColor?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onSave?: (title: string, content: string) => void;
  onClose?: () => void;
}

export function PreviewWidget({
  tileId,
  title,
  content,
  forceExpanded,
  openInEditMode,
  tileColor,
  onEdit,
  onDelete,
  onSave,
  onClose,
}: PreviewWidgetProps) {
  const { getItem, hasItem, isLoading } = useMapCache();
  const [showMetadata, setShowMetadata] = useState(false);
  const { expansion, editing } = usePreviewState({
    title,
    content,
    forceExpanded,
    openInEditMode,
    tileId,
  });

  const { isExpanded, setIsExpanded } = expansion;
  const {
    isEditing,
    setIsEditing,
    title: editTitle,
    setTitle: setEditTitle,
    content: editContent,
    setContent: setEditContent
  } = editing;

  // Auto-close widget if the previewed tile is deleted
  useEffect(() => {
    // Only check if cache is not loading to avoid false positives
    if (!isLoading && onClose) {
      const tile = getItem(tileId);
      const tileExists = hasItem(tileId);

      // Close widget if:
      // 1. Cache has the tile's region loaded but tile doesn't exist (deleted)
      // 2. Or we have no tile and hasItem returns false (confirmed deleted)
      if (!tile && !tileExists) {
        onClose();
      }
    }
  }, [tileId, getItem, hasItem, isLoading, onClose]);

  const _handleEdit = () => {
    setIsEditing(true);
    setIsExpanded(true);
  };

  const _handleSave = () => {
    if (onSave) {
      onSave(editTitle, editContent);
    }
    setIsEditing(false);
  };

  const _handleCancel = () => {
    setEditTitle(title);
    setEditContent(content);
    setIsEditing(false);
  };

  const _handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      _handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      _handleCancel();
    }
  };

  const _handleContentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      _handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      _handleCancel();
    }
  };

  const _handleShowMetadata = () => {
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

  return (
    <BaseWidget
      testId="preview-widget"
      className="flex-1 w-full relative"
    >
      <PreviewHeader
        tileId={tileId}
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
        onDelete={onDelete}
        onClose={onClose}
        onMetadata={_handleShowMetadata}
        onSave={_handleSave}
        onCancel={_handleCancel}
      />

      <ContentDisplay
        content={content}
        editContent={editContent}
        isEditing={isEditing}
        isExpanded={isExpanded}
        onContentChange={setEditContent}
        onContentKeyDown={_handleContentKeyDown}
      />

      {showMetadata && (
        <div className="absolute top-2 right-2 bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-800 px-2 py-1 rounded text-xs z-10">
          Metadata copied to clipboard!
        </div>
      )}
    </BaseWidget>
  );
}