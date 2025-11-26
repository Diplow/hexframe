'use client';

import { Edit, Trash2, X, Copy, History, FolderTree, Layers, Clock } from 'lucide-react';
import { ContextMenu, type ContextMenuItemData } from '~/components/ui/context-menu';

interface MenuDropdownProps {
  menuPosition: { top: number; left: number };
  onEdit?: () => void;
  onDelete?: () => void;
  onDeleteChildren?: () => void;
  onDeleteComposed?: () => void;
  onDeleteExecutionHistory?: () => void;
  onClose?: () => void;
  onCopyCoordinates?: () => void;
  onHistory?: () => void;
  onMenuClose: () => void;
}

export function _MenuDropdown({
  menuPosition,
  onEdit,
  onDelete,
  onDeleteChildren,
  onDeleteComposed,
  onDeleteExecutionHistory,
  onClose,
  onCopyCoordinates,
  onHistory,
  onMenuClose,
}: MenuDropdownProps) {
  // Build delete submenu items
  const deleteSubmenuItems: ContextMenuItemData[] = [];

  if (onDelete) {
    deleteSubmenuItems.push({
      icon: Trash2,
      label: 'Delete Tile',
      onClick: onDelete,
      variant: 'destructive',
    });
  }

  if (onDeleteChildren) {
    deleteSubmenuItems.push({
      icon: FolderTree,
      label: 'Delete Children',
      onClick: onDeleteChildren,
      variant: 'destructive',
    });
  }

  if (onDeleteComposed) {
    deleteSubmenuItems.push({
      icon: Layers,
      label: 'Delete Composed',
      onClick: onDeleteComposed,
      variant: 'destructive',
    });
  }

  if (onDeleteExecutionHistory) {
    deleteSubmenuItems.push({
      icon: Clock,
      label: 'Delete Exec History',
      onClick: onDeleteExecutionHistory,
      variant: 'destructive',
    });
  }

  // Determine if we should show submenu or single delete item
  const hasMultipleDeleteActions = deleteSubmenuItems.length > 1;

  // Build menu items
  const menuItems: ContextMenuItemData[] = [];

  if (onEdit) {
    menuItems.push({
      icon: Edit,
      label: 'Edit',
      onClick: onEdit,
    });
  }

  if (onHistory) {
    menuItems.push({
      icon: History,
      label: 'View History',
      onClick: onHistory,
    });
  }

  if (hasMultipleDeleteActions) {
    menuItems.push({
      icon: Trash2,
      label: 'Delete',
      variant: 'destructive',
      submenu: deleteSubmenuItems,
    });
  } else if (deleteSubmenuItems.length === 1) {
    // Single delete action - wire directly to its onClick
    const singleDeleteItem = deleteSubmenuItems[0]!;
    menuItems.push({
      icon: singleDeleteItem.icon ?? Trash2,
      label: singleDeleteItem.label,
      onClick: singleDeleteItem.onClick,
      variant: 'destructive',
    });
  }

  if (onCopyCoordinates) {
    menuItems.push({
      icon: Copy,
      label: 'Copy Coordinates',
      onClick: onCopyCoordinates,
    });
  }

  if (onClose) {
    menuItems.push({
      icon: X,
      label: 'Close',
      onClick: onClose,
      separator: menuItems.length > 0,
    });
  }

  return (
    <ContextMenu
      position={{ x: menuPosition.left, y: menuPosition.top }}
      items={menuItems}
      onClose={onMenuClose}
    />
  );
}
