'use client';

import { useEffect, useState } from 'react';
import { TileHeader } from '~/app/map/Chat/Timeline/Widgets/TileWidget/TileHeader';
import { ContentDisplay } from '~/app/map/Chat/Timeline/Widgets/TileWidget/ContentDisplay';
import { TileForm } from '~/app/map/Chat/Timeline/Widgets/TileWidget/TileForm';
import { useTileState } from '~/app/map/Chat/Timeline/Widgets/TileWidget/useTileState';
import {
  _handleEdit,
  _handleSave,
  _handleCancel,
  _handleShowMetadata,
  _handleTitleKeyDown,
  _handleConfirmDelete,
} from '~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/_handlers';
import { _DeleteConfirmation } from '~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/_DeleteConfirmation';
import { BaseWidget } from '~/app/map/Chat/Timeline/Widgets/_shared';
import { TileHistoryView } from '~/app/map/Chat/Timeline/Widgets/TileHistoryWidget/TileHistoryWidget';
import { useMapCache } from '~/app/map/Cache';
import { CoordSystem } from '~/lib/domains/mapping/utils';
import { getColor } from '~/app/map/types';

interface TileWidgetProps {
  mode?: 'view' | 'edit' | 'create' | 'delete' | 'history';
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
  onEdit,
  onDelete: _onDelete,
  onSave,
  onClose,
}: TileWidgetProps) {
  const { getItem, hasItem, isLoading, deleteItemOptimistic } = useMapCache();
  const [showMetadata, setShowMetadata] = useState(false);
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
  const handleHistory = () => setCurrentMode('history');

  if (currentMode === 'delete') {
    return <_DeleteConfirmation title={title} tileId={tileId} coordId={coordId} isDeleting={isDeleting}
                                deleteError={deleteError} onCancel={handleCancel}
                                onConfirmDelete={() => void handleConfirmDelete()} />;
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
        onToggleExpansion={() => setIsExpanded(!isExpanded)}
        onTitleChange={setEditTitle}
        onTitleKeyDown={handleTitleKeyDown}
        onEdit={onEdit ? handleEdit : undefined}
        onDelete={currentMode !== 'create' ? () => setCurrentMode('delete') : undefined}
        onClose={onClose}
        onMetadata={currentMode !== 'create' ? () => _handleShowMetadata(tileId, getItem, setShowMetadata) : undefined}
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

      {showMetadata && (
        <div className="absolute top-2 right-2 bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-800 px-2 py-1 rounded text-xs z-10">
          Metadata copied to clipboard!
        </div>
      )}
    </BaseWidget>
  );
}