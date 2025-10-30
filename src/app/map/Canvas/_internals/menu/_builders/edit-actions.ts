import { Edit, Trash2, Move, Copy, Plus, History } from "lucide-react";
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
          className: "text-link",
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

export function _buildDeleteItem(
  canEdit: boolean,
  onDelete?: () => void,
): MenuItem[] {
  return canEdit && onDelete
    ? [
        {
          icon: Trash2,
          label: "Delete",
          shortcut: "",
          onClick: onDelete,
          className:
            "text-[color:var(--destructive-color-600)] dark:text-[color:var(--destructive-color-400)]",
        },
      ]
    : [];
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
