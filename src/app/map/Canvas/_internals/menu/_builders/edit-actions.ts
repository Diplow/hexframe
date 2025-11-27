import { Edit, Trash2, Move, Copy, Plus, History, Layers, FolderTree, Clock, Clipboard } from "lucide-react";
import type { MenuItem } from "~/app/map/Canvas/_internals/menu/items-builder";

/**
 * Edit-related menu item builders (Edit, Copy, Move, Delete, Create, History)
 */

export function _buildEditItem(
  canEdit: boolean,
  onEdit?: () => void,
): MenuItem[] {
  return canEdit && onEdit
    ? [
        {
          icon: Edit,
          label: "Edit",
          shortcut: "",
          onClick: onEdit,
          separator: true,
        },
      ]
    : [];
}

export function _buildCopyItem(
  canEdit: boolean,
  onCopy?: () => void,
): MenuItem[] {
  return canEdit && onCopy
    ? [
        {
          icon: Copy,
          label: "Copy to...",
          shortcut: "Drag",
          onClick: onCopy,
        },
      ]
    : [];
}

export function _buildMoveItem(
  canEdit: boolean,
  onMove?: () => void,
): MenuItem[] {
  return canEdit && onMove
    ? [
        {
          icon: Move,
          label: "Move to...",
          shortcut: "Ctrl+Drag",
          onClick: onMove,
        },
      ]
    : [];
}

interface DeleteSubmenuCallbacks {
  onDelete?: () => void;
  onDeleteChildren?: () => void;
  onDeleteComposed?: () => void;
  onDeleteExecutionHistory?: () => void;
}

export function _buildDeleteSubmenu(
  canEdit: boolean,
  callbacks: DeleteSubmenuCallbacks,
): MenuItem[] {
  const { onDelete, onDeleteChildren, onDeleteComposed, onDeleteExecutionHistory } = callbacks;

  if (!canEdit) return [];

  // Build submenu items
  const submenuItems: MenuItem[] = [];

  if (onDelete) {
    submenuItems.push({
      icon: Trash2,
      label: "Delete Tile",
      shortcut: "",
      onClick: onDelete,
      variant: "destructive",
    });
  }

  if (onDeleteChildren) {
    submenuItems.push({
      icon: FolderTree,
      label: "Delete Children",
      shortcut: "",
      onClick: onDeleteChildren,
      variant: "destructive",
    });
  }

  if (onDeleteComposed) {
    submenuItems.push({
      icon: Layers,
      label: "Delete Composed",
      shortcut: "",
      onClick: onDeleteComposed,
      variant: "destructive",
    });
  }

  if (onDeleteExecutionHistory) {
    submenuItems.push({
      icon: Clock,
      label: "Delete Exec History",
      shortcut: "",
      onClick: onDeleteExecutionHistory,
      variant: "destructive",
    });
  }

  // If we only have the main delete action, return it directly without a submenu
  if (submenuItems.length === 1 && onDelete) {
    return [{
      icon: Trash2,
      label: "Delete",
      shortcut: "",
      onClick: onDelete,
      variant: "destructive",
    }];
  }

  // If we have multiple actions, return a submenu
  if (submenuItems.length > 0) {
    return [{
      icon: Trash2,
      label: "Delete",
      shortcut: "",
      variant: "destructive",
      submenu: submenuItems,
    }];
  }

  return [];
}

export function _buildCreateItem(
  canEdit: boolean,
  onCreate?: () => void,
): MenuItem[] {
  return onCreate && canEdit
    ? [
        {
          icon: Plus,
          label: "Create Tile",
          shortcut: "Hover",
          onClick: onCreate,
        },
      ]
    : [];
}

export function _buildViewHistoryItem(onViewHistory?: () => void): MenuItem[] {
  return onViewHistory
    ? [
        {
          icon: History,
          label: "View History",
          shortcut: "",
          onClick: onViewHistory,
        },
      ]
    : [];
}

export function _buildCopyCoordinatesItem(
  onCopyCoordinates?: () => void,
): MenuItem[] {
  return onCopyCoordinates
    ? [
        {
          icon: Clipboard,
          label: "Copy Coordinates",
          shortcut: "",
          onClick: onCopyCoordinates,
        },
      ]
    : [];
}
