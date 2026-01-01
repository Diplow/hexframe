'use client';

import { useEffect, useState } from 'react';
import { CopyFeedback, useCopyFeedback, copyToClipboard } from '~/components/ui/copy-feedback';
import { TileHeader } from '~/app/map/Chat/Timeline/Widgets/TileWidget/TileHeader';
import { ContentDisplay } from '~/app/map/Chat/Timeline/Widgets/TileWidget/ContentDisplay';
import { TileForm } from '~/app/map/Chat/Timeline/Widgets/TileWidget/TileForm';
import { useTileState } from '~/app/map/Chat/Timeline/Widgets/TileWidget/useTileState';
import {
  _handleEdit,
  _handleSave,
  _handleCancel,
  _handleTitleKeyDown,
  _handleConfirmDelete,
  _handleConfirmDeleteChildren,
} from '~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/_handlers';
import { _DeleteConfirmation } from '~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/_DeleteConfirmation';
import { _DeleteChildrenConfirmation } from '~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/_DeleteChildrenConfirmation';
import { BaseWidget } from '~/app/map/Chat/Timeline/Widgets/_shared';
import { TileHistoryView } from '~/app/map/Chat/Timeline/Widgets/TileHistoryWidget/TileHistoryWidget';
import { useMapCache } from '~/app/map/Cache';
import { CoordSystem } from '~/lib/domains/mapping/utils';
import { getColor } from '~/app/map/types';
import type { Visibility } from '~/lib/domains/mapping/utils';

interface TileWidgetProps {
  mode?: 'view' | 'edit' | 'create' | 'delete' | 'delete_children' | 'history';
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
  directionType?: 'structural' | 'composed' | 'hexPlan';
  visibility?: Visibility;
  onEdit?: () => void;
  onDelete?: () => void;
  onDeleteChildren?: () => void;
  onDeleteComposed?: () => void;
  onDeleteHexplan?: () => void;
  onSetVisibility?: (visibility: Visibility) => void;
  onSetVisibilityWithDescendants?: (visibility: Visibility) => void;
  onSave?: (title: string, preview: string, content: string) => void;
  onClose?: () => void;
}

function useAutoCloseOnDelete(
  tileId: string | undefined,
  currentMode: string,
  getItem: (id: string) => unknown,
  hasItem: (id: string) => boolean,
  isLoading: boolean,
  onClose?: () => void
) {
  useEffect(() => {
    if (!isLoading && onClose && currentMode !== 'create' && tileId) {
      const tile = getItem(tileId);
      const tileExists = hasItem(tileId);
      if (!tile && !tileExists) onClose();
    }
  }, [tileId, getItem, hasItem, isLoading, onClose, currentMode]);
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
  directionType = 'structural',
  visibility,
  onEdit,
  onDelete: _onDelete,
  onDeleteChildren,
  onDeleteComposed,
  onDeleteHexplan,
  onSetVisibility,
  onSetVisibilityWithDescendants,
  onSave,
  onClose,
}: TileWidgetProps) {
  const { getItem, hasItem, isLoading, deleteItemOptimistic, deleteChildrenByTypeOptimistic } = useMapCache();
  const { show: showCopied, isError: isCopyError, triggerSuccess: triggerCopySuccess, triggerError: triggerCopyError } = useCopyFeedback();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [currentMode, setCurrentMode] = useState(initialMode);

  const tileColor = currentMode === 'create' && coordId ? getColor(CoordSystem.parseId(coordId)) : providedTileColor;

  const { expansion, editing } = useTileState({
    title, preview, content, forceExpanded,
    openInEditMode: currentMode === 'create' ? true : openInEditMode,
    tileId: tileId ?? '',
  });

  const { isExpanded, setIsExpanded } = expansion;
  const { isEditing, setIsEditing, title: editTitle, setTitle: setEditTitle,
          preview: editPreview, setPreview: setEditPreview,
          content: editContent, setContent: setEditContent } = editing;

  useAutoCloseOnDelete(tileId, currentMode, getItem, hasItem, isLoading, onClose);

  const editState = { setIsEditing, setIsExpanded, setEditTitle, setEditPreview, setEditContent };
  const handleEdit = () => {
    // Exit history mode first if active
    setCurrentMode('view');
    // Use setTimeout to ensure mode change is processed before setting edit state
    setTimeout(() => {
      _handleEdit(editState);
    }, 0);
  };
  const handleSave = () => _handleSave(editTitle, editPreview, editContent, currentMode, setIsEditing, onSave);
  const handleCancel = () => _handleCancel(currentMode, title, preview, content, editState, onClose);
  const handleTitleKeyDown = (e: React.KeyboardEvent) => _handleTitleKeyDown(e, handleCancel);
  const handleConfirmDelete = () => _handleConfirmDelete(tileId, setIsDeleting, setDeleteError, deleteItemOptimistic, onClose);
  const handleConfirmDeleteChildren = () => _handleConfirmDeleteChildren(tileId, directionType, setIsDeleting, setDeleteError, deleteChildrenByTypeOptimistic, onClose);
  const handleHistory = () => setCurrentMode('history');

  if (currentMode === 'delete') {
    return <_DeleteConfirmation title={title} tileId={tileId} coordId={coordId} isDeleting={isDeleting}
                                deleteError={deleteError} onCancel={handleCancel}
                                onConfirmDelete={() => void handleConfirmDelete()} />;
  }

  if (currentMode === 'delete_children') {
    return <_DeleteChildrenConfirmation title={title} tileId={tileId} coordId={coordId}
                                        directionType={directionType} isDeleting={isDeleting}
                                        deleteError={deleteError} onCancel={handleCancel}
                                        onConfirmDelete={() => void handleConfirmDeleteChildren()} />;
  }

  if (currentMode === 'history' && coordId) {
    const coords = CoordSystem.parseId(coordId);
    return (
      <BaseWidget testId="tile-widget-history" className="flex-1 w-full relative">
        <TileHistoryView coords={coords} onClose={() => setCurrentMode('view')} />
      </BaseWidget>
    );
  }

  const isFormMode = isEditing || currentMode === 'create';
  const isViewMode = currentMode !== 'create' && !isEditing;

  const historyHandler = currentMode !== 'create' && coordId ? handleHistory : undefined;

  return (
    <BaseWidget testId={currentMode === 'create' ? 'creation-widget' : 'tile-widget'} className="flex-1 w-full relative">
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
        visibility={visibility}
        onToggleExpansion={() => setIsExpanded(!isExpanded)}
        onTitleChange={setEditTitle}
        onTitleKeyDown={handleTitleKeyDown}
        onEdit={onEdit ? handleEdit : undefined}
        onDelete={currentMode !== 'create' ? () => setCurrentMode('delete') : undefined}
        onDeleteChildren={currentMode !== 'create' ? onDeleteChildren : undefined}
        onDeleteComposed={currentMode !== 'create' ? onDeleteComposed : undefined}
        onDeleteHexplan={currentMode !== 'create' ? onDeleteHexplan : undefined}
        onSetVisibility={currentMode !== 'create' ? onSetVisibility : undefined}
        onSetVisibilityWithDescendants={currentMode !== 'create' ? onSetVisibilityWithDescendants : undefined}
        onClose={onClose}
        onCopyCoordinates={currentMode !== 'create' ? () => copyToClipboard(coordId, triggerCopySuccess, triggerCopyError) : undefined}
        onHistory={historyHandler}
        onSave={handleSave}
        onCancel={handleCancel}
      />

      {isFormMode && (
        <TileForm mode={currentMode === 'create' ? 'create' : 'edit'} title={editTitle}
                  preview={editPreview} content={editContent} onPreviewChange={setEditPreview}
                  onContentChange={setEditContent} onSave={handleSave} onCancel={handleCancel} />
      )}

      {isViewMode && (
        <ContentDisplay content={content} preview={preview} isExpanded={isExpanded}
                        onToggleExpansion={() => setIsExpanded(!isExpanded)} />
      )}

      {showCopied && (
        <CopyFeedback
          message={isCopyError ? "Failed to copy coordinates" : "Coordinates copied to clipboard!"}
          variant={isCopyError ? "error" : "success"}
        />
      )}
    </BaseWidget>
  );
}