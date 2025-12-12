import { Edit, Trash2, Move, Copy, Plus, Layers, FolderTree, Clock } from "lucide-react";
import type { MenuItem } from "~/app/map/Canvas/Menu/items-builder";

// Re-export visibility actions for backward compatibility
export {
  _buildVisibilitySubmenu,
  _buildVisibilityItem,
  _buildViewHistoryItem,
  _buildCopyCoordinatesItem,
} from "~/app/map/Canvas/Menu/_builders/visibility-actions";

/**
 * Edit-related menu item builders (Edit, Copy, Move, Delete, Create)
 */

export function _buildEditItem(canEdit: boolean, onEdit?: () => void): MenuItem[] {
  return canEdit && onEdit
    ? [{ icon: Edit, label: "Edit", shortcut: "", onClick: onEdit, separator: true }]
    : [];
}

export function _buildCopyItem(canEdit: boolean, onCopy?: () => void): MenuItem[] {
  return canEdit && onCopy
    ? [{ icon: Copy, label: "Copy to...", shortcut: "Drag", onClick: onCopy }]
    : [];
}

export function _buildMoveItem(canEdit: boolean, onMove?: () => void): MenuItem[] {
  return canEdit && onMove
    ? [{ icon: Move, label: "Move to...", shortcut: "Ctrl+Drag", onClick: onMove }]
    : [];
}

export function _buildCreateItem(canEdit: boolean, onCreate?: () => void): MenuItem[] {
  return onCreate && canEdit
    ? [{ icon: Plus, label: "Create Tile", shortcut: "Hover", onClick: onCreate }]
    : [];
}

interface DeleteSubmenuCallbacks {
  onDelete?: () => void;
  onDeleteChildren?: () => void;
  onDeleteComposed?: () => void;
  onDeleteExecutionHistory?: () => void;
}

export function _buildDeleteSubmenu(canEdit: boolean, callbacks: DeleteSubmenuCallbacks): MenuItem[] {
  const { onDelete, onDeleteChildren, onDeleteComposed, onDeleteExecutionHistory } = callbacks;
  if (!canEdit) return [];

  const submenuItems: MenuItem[] = [];
  if (onDelete) submenuItems.push({ icon: Trash2, label: "Delete Tile", shortcut: "", onClick: onDelete, variant: "destructive" });
  if (onDeleteChildren) submenuItems.push({ icon: FolderTree, label: "Delete Children", shortcut: "", onClick: onDeleteChildren, variant: "destructive" });
  if (onDeleteComposed) submenuItems.push({ icon: Layers, label: "Delete Composed", shortcut: "", onClick: onDeleteComposed, variant: "destructive" });
  if (onDeleteExecutionHistory) submenuItems.push({ icon: Clock, label: "Delete Exec History", shortcut: "", onClick: onDeleteExecutionHistory, variant: "destructive" });

  if (submenuItems.length === 1 && onDelete) {
    return [{ icon: Trash2, label: "Delete", shortcut: "", onClick: onDelete, variant: "destructive" }];
  }
  if (submenuItems.length > 0) {
    return [{ icon: Trash2, label: "Delete", shortcut: "", variant: "destructive", submenu: submenuItems }];
  }
  return [];
}
