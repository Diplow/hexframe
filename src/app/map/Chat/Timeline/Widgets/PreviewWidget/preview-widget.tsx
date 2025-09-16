'use client';

import { PreviewHeader } from '~/app/map/Chat/Timeline/Widgets/PreviewWidget/PreviewHeader';
import { ContentDisplay } from '~/app/map/Chat/Timeline/Widgets/PreviewWidget/ContentDisplay';
import { usePreviewState } from '~/app/map/Chat/Timeline/Widgets/PreviewWidget/usePreviewState';
import { BaseWidget } from '~/app/map/Chat/Timeline/Widgets/_shared';

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
    </BaseWidget>
  );
}