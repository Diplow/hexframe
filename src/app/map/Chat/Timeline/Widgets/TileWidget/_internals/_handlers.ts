import type { KeyboardEvent } from 'react';

interface EditState {
  setIsEditing: (value: boolean) => void;
  setIsExpanded: (value: boolean) => void;
  setEditTitle: (value: string) => void;
  setEditPreview: (value: string) => void;
  setEditContent: (value: string) => void;
}

export function _handleEdit(editState: EditState) {
  editState.setIsEditing(true);
  editState.setIsExpanded(true);
}

export function _handleSave(
  editTitle: string,
  editPreview: string,
  editContent: string,
  currentMode: 'view' | 'edit' | 'create' | 'delete',
  setIsEditing: (value: boolean) => void,
  onSave?: (title: string, preview: string, content: string) => void
) {
  onSave?.(editTitle, editPreview, editContent);
  if (currentMode !== 'create') {
    setIsEditing(false);
  }
}

export function _handleCancel(
  currentMode: 'view' | 'edit' | 'create' | 'delete',
  title: string,
  preview: string,
  content: string,
  editState: EditState,
  onClose?: () => void
) {
  if (currentMode === 'create' || currentMode === 'delete') {
    onClose?.();
  } else {
    editState.setEditTitle(title);
    editState.setEditPreview(preview);
    editState.setEditContent(content);
    editState.setIsEditing(false);
  }
}

export function _handleShowMetadata(
  tileId: string | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getItem: (id: string) => any,
  setShowMetadata: (value: boolean) => void
) {
  if (!tileId) return;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const tile = getItem(tileId);
  if (!tile) return;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const metadata = tile.metadata;
  if (!metadata) return;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-assignment
  const { dbId, coordId, ownerId } = metadata;
  const metadataText = `Tile Metadata:\n- Database ID: ${dbId}\n- Coordinate ID: ${coordId}\n- Owner ID: ${ownerId}`;

  void navigator.clipboard.writeText(metadataText).then(() => {
    setShowMetadata(true);
    setTimeout(() => setShowMetadata(false), 2000);
  });
}

export function _handleTitleKeyDown(
  e: KeyboardEvent,
  onCancel: () => void
) {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.querySelector<HTMLTextAreaElement>('[data-field="preview"]')?.focus();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    onCancel();
  }
}

export async function _handleConfirmDelete(
  tileId: string | undefined,
  setIsDeleting: (value: boolean) => void,
  setDeleteError: (value: string) => void,
  deleteItemOptimistic: (id: string) => Promise<void>,
  onClose?: () => void
) {
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
}
