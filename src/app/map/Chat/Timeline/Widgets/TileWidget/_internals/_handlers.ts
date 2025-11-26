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
  currentMode: 'view' | 'edit' | 'create' | 'delete' | 'delete_children' | 'history',
  setIsEditing: (value: boolean) => void,
  onSave?: (title: string, preview: string, content: string) => void
) {
  onSave?.(editTitle, editPreview, editContent);
  if (currentMode !== 'create') {
    setIsEditing(false);
  }
}

export function _handleCancel(
  currentMode: 'view' | 'edit' | 'create' | 'delete' | 'delete_children' | 'history',
  title: string,
  preview: string,
  content: string,
  editState: EditState,
  onClose?: () => void
) {
  if (currentMode === 'create' || currentMode === 'delete' || currentMode === 'delete_children' || currentMode === 'history') {
    onClose?.();
  } else {
    editState.setEditTitle(title);
    editState.setEditPreview(preview);
    editState.setEditContent(content);
    editState.setIsEditing(false);
  }
}

export function _handleCopyCoordinates(
  coordId: string | undefined,
  onCopied: () => void
) {
  if (!coordId) return;

  void navigator.clipboard.writeText(coordId).then(() => {
    onCopied();
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

export async function _handleConfirmDeleteChildren(
  tileId: string | undefined,
  directionType: 'structural' | 'composed' | 'executionHistory',
  setIsDeleting: (value: boolean) => void,
  setDeleteError: (value: string) => void,
  deleteChildrenByTypeOptimistic: (id: string, directionType: 'structural' | 'composed' | 'executionHistory') => Promise<{ success: boolean; deletedCount: number }>,
  onClose?: () => void
) {
  if (!tileId) return;

  setIsDeleting(true);
  setDeleteError('');

  try {
    await deleteChildrenByTypeOptimistic(tileId, directionType);
    onClose?.();
  } catch (err) {
    setDeleteError(err instanceof Error ? err.message : 'Failed to delete children');
  } finally {
    setIsDeleting(false);
  }
}
