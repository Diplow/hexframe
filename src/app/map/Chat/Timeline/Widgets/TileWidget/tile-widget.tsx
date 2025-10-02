'use client';

import { useEffect, useState } from 'react';
import { TileHeader } from '~/app/map/Chat/Timeline/Widgets/TileWidget/TileHeader';
import { ContentDisplay } from '~/app/map/Chat/Timeline/Widgets/TileWidget/ContentDisplay';
import { TileForm } from '~/app/map/Chat/Timeline/Widgets/TileWidget/TileForm';
import { useTileState } from '~/app/map/Chat/Timeline/Widgets/TileWidget/useTileState';
import { BaseWidget, WidgetHeader, WidgetContent, WidgetActions } from '~/app/map/Chat/Timeline/Widgets/_shared';
import { useMapCache } from '~/app/map/Cache';
import { CoordSystem } from '~/lib/domains/mapping/utils';
import { getColor } from '~/app/map/types';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '~/components/ui/button';

interface TileWidgetProps {
  mode?: 'view' | 'edit' | 'create' | 'delete';
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
  mode: initialMode = 'view',
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
  onDelete: _onDelete,
  onSave,
  onClose,
}: TileWidgetProps) {
  const { getItem, hasItem, isLoading, deleteItemOptimistic } = useMapCache();
  const [showMetadata, setShowMetadata] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Internal mode state - allows switching from view to delete mode
  const [currentMode, setCurrentMode] = useState(initialMode);

  // Calculate tile color for creation mode
  const tileColor = currentMode === 'create' && coordId
    ? getColor(CoordSystem.parseId(coordId))
    : providedTileColor;

  const { expansion, editing } = useTileState({
    title,
    preview,
    content,
    forceExpanded,
    openInEditMode: currentMode === 'create' ? true : openInEditMode,
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
    if (!isLoading && onClose && currentMode !== 'create' && tileId) {
      const tile = getItem(tileId);
      const tileExists = hasItem(tileId);

      // Close widget if:
      // 1. Cache has the tile's region loaded but tile doesn't exist (deleted)
      // 2. Or we have no tile and hasItem returns false (confirmed deleted)
      if (!tile && !tileExists) {
        onClose();
      }
    }
  }, [tileId, getItem, hasItem, isLoading, onClose, currentMode]);

  const _handleEdit = () => {
    setIsEditing(true);
    setIsExpanded(true);
  };

  const _handleSave = () => {
    if (onSave) {
      onSave(editTitle, editPreview, editContent);
    }
    if (currentMode !== 'create') {
      setIsEditing(false);
    }
  };

  const _handleCancel = () => {
    if (currentMode === 'create' || currentMode === 'delete') {
      onClose?.();
    } else {
      setEditTitle(title);
      setEditPreview(preview);
      setEditContent(content);
      setIsEditing(false);
    }
  };

  const _handleDeleteClick = () => {
    // Switch to delete confirmation mode
    setCurrentMode('delete');
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

  const _handleConfirmDelete = async () => {
    if (!tileId) return;

    setIsDeleting(true);
    setDeleteError('');

    try {
      await deleteItemOptimistic(tileId);
      onClose?.();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete tile');
    } finally {
      setIsDeleting(false);
    }
  };

  // Render delete confirmation mode
  if (currentMode === 'delete') {
    return (
      <BaseWidget variant="default" className="w-full">
        <WidgetHeader
          icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
          title="Delete Tile?"
          onClose={_handleCancel}
        />

        <WidgetContent>
          <div className="space-y-3">
            <p className="text-sm">
              Delete &ldquo;{title || 'this tile'}&rdquo;? This action cannot be undone.
            </p>

            {(Boolean(tileId?.includes(':') && (tileId.split(':')[1]?.length ?? 0) > 0) ||
              Boolean(coordId?.includes(':') && (coordId.split(':')[1]?.length ?? 0) > 0)) && (
              <p className="text-sm text-muted-foreground">
                All child tiles will also be deleted.
              </p>
            )}

            {deleteError && (
              <div className="text-sm text-destructive">
                {deleteError}
              </div>
            )}
          </div>

          <WidgetActions align="between">
            <Button
              onClick={_handleCancel}
              disabled={isDeleting}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void _handleConfirmDelete()}
              disabled={isDeleting}
              variant="destructive"
              size="sm"
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </WidgetActions>
        </WidgetContent>
      </BaseWidget>
    );
  }

  return (
    <BaseWidget
      testId={currentMode === 'create' ? 'creation-widget' : 'tile-widget'}
      className="flex-1 w-full relative"
    >
      <TileHeader
        tileId={tileId}
        coordId={coordId}
        mode={currentMode}
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
        onDelete={currentMode !== 'create' ? _handleDeleteClick : undefined}
        onClose={onClose}
        onMetadata={currentMode !== 'create' ? _handleShowMetadata : undefined}
        onSave={_handleSave}
        onCancel={_handleCancel}
      />

      {/* Show form when editing or creating */}
      {(isEditing || currentMode === 'create') && (
        <TileForm
          mode={currentMode === 'create' ? 'create' : 'edit'}
          title={editTitle}
          preview={editPreview}
          content={editContent}
          onPreviewChange={setEditPreview}
          onContentChange={setEditContent}
          onSave={_handleSave}
          onCancel={_handleCancel}
        />
      )}

      {/* Show content display only in view mode */}
      {currentMode !== 'create' && !isEditing && (
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