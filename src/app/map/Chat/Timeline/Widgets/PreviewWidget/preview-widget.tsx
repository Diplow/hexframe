'use client';

import { useEffect } from 'react';
import { PreviewHeader } from '~/app/map/Chat/Timeline/Widgets/PreviewWidget/PreviewHeader';
import { ContentDisplay } from '~/app/map/Chat/Timeline/Widgets/PreviewWidget/ContentDisplay';
import { usePreviewState } from '~/app/map/Chat/Timeline/Widgets/PreviewWidget/usePreviewState';
import { BaseWidget } from '~/app/map/Chat/Timeline/Widgets/_shared';
import { useMapCache } from '~/app/map/Cache';
import type { UseDOMBasedDragReturn } from '~/app/map/Services';

interface PreviewWidgetProps {
  tileId: string;
  title: string;
  content: string;
  forceExpanded?: boolean;
  openInEditMode?: boolean;
  tileColor?: string;
  dragService?: UseDOMBasedDragReturn;
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
  dragService,
  onEdit,
  onDelete,
  onSave,
  onClose,
}: PreviewWidgetProps) {
  const { getItem, hasItem, isLoading } = useMapCache();
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

  return (
    <BaseWidget
      testId="preview-widget"
      className="flex-1 w-full"
    >
      <PreviewHeader
        tileId={tileId}
        title={title}
        isExpanded={isExpanded}
        isEditing={isEditing}
        editTitle={editTitle}
        hasContent={!!content}
        tileColor={tileColor}
        dragService={dragService}
        onToggleExpansion={() => setIsExpanded(!isExpanded)}
        onTitleChange={setEditTitle}
        onTitleKeyDown={_handleTitleKeyDown}
        onEdit={onEdit ? _handleEdit : undefined}
        onDelete={onDelete}
        onClose={onClose}
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
    </BaseWidget>
  );
}