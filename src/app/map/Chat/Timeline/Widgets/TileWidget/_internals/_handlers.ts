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

type EditableItemType = 'organizational' | 'context' | 'system';

export function _handleSave(
  editTitle: string,
  editPreview: string,
  editContent: string,
  editItemType: EditableItemType | undefined,
  currentMode: 'view' | 'edit' | 'create' | 'delete' | 'delete_children' | 'history',
  setIsEditing: (value: boolean) => void,
  onSave?: (title: string, preview: string, content: string, itemType?: EditableItemType) => void
) {
  onSave?.(editTitle, editPreview, editContent, editItemType);
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
  directionType: 'structural' | 'composed' | 'hexPlan',
  setIsDeleting: (value: boolean) => void,
  setDeleteError: (value: string) => void,
  deleteChildrenByTypeOptimistic: (id: string, directionType: 'structural' | 'composed' | 'hexPlan') => Promise<{ success: boolean; deletedCount: number }>,
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
