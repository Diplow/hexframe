'use client';

import { cn } from '~/lib/utils';
import { PreviewHeader } from './PreviewHeader';
import { ContentDisplay } from './ContentDisplay';
import { usePreviewState } from './usePreviewState';

interface PreviewWidgetProps {
  tileId: string;
  title: string;
  content: string;
  forceExpanded?: boolean;
  openInEditMode?: boolean;
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
  onEdit,
  onDelete,
  onSave,
  onClose,
}: PreviewWidgetProps) {
  const {
    isExpanded,
    setIsExpanded,
    isEditing,
    setIsEditing,
    editTitle,
    setEditTitle,
    editContent,
    setEditContent,
  } = usePreviewState({
    title,
    content,
    forceExpanded,
    openInEditMode,
    tileId,
  });

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
    <div 
      data-testid="preview-widget" 
      className={cn(
        "flex flex-col flex-1 w-full bg-neutral-400 dark:bg-neutral-600",
        "rounded-lg shadow-md",
        "overflow-hidden relative"
      )}
    >
      <PreviewHeader
        title={title}
        isExpanded={isExpanded}
        isEditing={isEditing}
        editTitle={editTitle}
        hasContent={!!content}
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
    </div>
  );
}