'use client';

import { Edit, Trash2, X, Copy, History, FolderTree, Layers, Clock, Lock, Unlock, Eye } from 'lucide-react';
import { ContextMenu, type ContextMenuItemData } from '~/components/ui/context-menu';
import { Visibility } from '~/lib/domains/mapping/utils';

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
  visibility?: Visibility;
  onSetVisibility?: (visibility: Visibility) => void;
  onSetVisibilityWithDescendants?: (visibility: Visibility) => void;
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
  visibility,
  onSetVisibility,
  onSetVisibilityWithDescendants,
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

  // Build visibility submenu
  if (visibility && (onSetVisibility || onSetVisibilityWithDescendants)) {
    const isPrivate = visibility === Visibility.PRIVATE;
    const targetVisibility = isPrivate ? Visibility.PUBLIC : Visibility.PRIVATE;
    const actionLabel = isPrivate ? 'Public' : 'Private';

    const visibilitySubmenuItems: ContextMenuItemData[] = [];

    if (onSetVisibility) {
      visibilitySubmenuItems.push({
        icon: isPrivate ? Unlock : Lock,
        label: `Make ${actionLabel}`,
        onClick: () => onSetVisibility(targetVisibility),
      });
    }

    if (onSetVisibilityWithDescendants) {
      visibilitySubmenuItems.push({
        icon: isPrivate ? Unlock : Lock,
        label: `Make ${actionLabel} (with descendants)`,
        onClick: () => onSetVisibilityWithDescendants(targetVisibility),
      });
    }

    // If only one option, show directly; otherwise show submenu
    if (visibilitySubmenuItems.length === 1) {
      menuItems.push(visibilitySubmenuItems[0]!);
    } else if (visibilitySubmenuItems.length > 1) {
      menuItems.push({
        icon: Eye,
        label: 'Visibility',
        submenu: visibilitySubmenuItems,
      });
    }
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
