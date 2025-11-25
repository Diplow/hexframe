'use client';

import { Edit, Trash2, X, Copy, History, FolderTree, Layers, Clock } from 'lucide-react';
import { Portal } from '~/app/map/Chat/Timeline/Widgets/Portal';
import { _MenuItem, type MenuItemData } from '~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/menu/_MenuItem';
import type { RefObject } from 'react';

interface MenuDropdownProps {
  menuRef: RefObject<HTMLDivElement>;
  menuPosition: { top: number; left: number };
  onEdit?: () => void;
  onDelete?: () => void;
  onDeleteChildren?: () => void;
  onDeleteComposed?: () => void;
  onDeleteExecutionHistory?: () => void;
  onClose?: () => void;
  onMetadata?: () => void;
  onHistory?: () => void;
  onMenuAction: (action: (() => void) | undefined) => void;
}

export function _MenuDropdown({
  menuRef,
  menuPosition,
  onEdit,
  onDelete,
  onDeleteChildren,
  onDeleteComposed,
  onDeleteExecutionHistory,
  onClose,
  onMetadata,
  onHistory,
  onMenuAction,
}: MenuDropdownProps) {
  // Build delete submenu items
  const deleteSubmenuItems: MenuItemData[] = [];

  if (onDelete) {
    deleteSubmenuItems.push({
      icon: Trash2,
      label: 'Delete Tile',
      onClick: () => onMenuAction(onDelete),
      variant: 'destructive',
    });
  }

  if (onDeleteChildren) {
    deleteSubmenuItems.push({
      icon: FolderTree,
      label: 'Delete Children',
      onClick: () => onMenuAction(onDeleteChildren),
      variant: 'destructive',
    });
  }

  if (onDeleteComposed) {
    deleteSubmenuItems.push({
      icon: Layers,
      label: 'Delete Composed',
      onClick: () => onMenuAction(onDeleteComposed),
      variant: 'destructive',
    });
  }

  if (onDeleteExecutionHistory) {
    deleteSubmenuItems.push({
      icon: Clock,
      label: 'Delete Exec History',
      onClick: () => onMenuAction(onDeleteExecutionHistory),
      variant: 'destructive',
    });
  }

  // Determine if we should show submenu or single delete item
  const hasMultipleDeleteActions = deleteSubmenuItems.length > 1;

  return (
    <Portal>
      <div
        ref={menuRef}
        className="fixed z-50 min-w-[120px] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg"
        style={{ top: menuPosition.top, left: menuPosition.left }}
      >
        {onEdit && (
          <div onClick={(e) => e.stopPropagation()}>
            <_MenuItem
              icon={Edit}
              label="Edit"
              onClick={() => onMenuAction(onEdit)}
            />
          </div>
        )}
        {onHistory && (
          <div onClick={(e) => e.stopPropagation()}>
            <_MenuItem
              icon={History}
              label="View History"
              onClick={() => onMenuAction(onHistory)}
            />
          </div>
        )}
        {hasMultipleDeleteActions ? (
          <div onClick={(e) => e.stopPropagation()}>
            <_MenuItem
              icon={Trash2}
              label="Delete"
              variant="destructive"
              submenu={deleteSubmenuItems}
            />
          </div>
        ) : onDelete && (
          <div onClick={(e) => e.stopPropagation()}>
            <_MenuItem
              icon={Trash2}
              label="Delete"
              onClick={() => onMenuAction(onDelete)}
              variant="destructive"
            />
          </div>
        )}
        {onMetadata && (
          <div onClick={(e) => e.stopPropagation()}>
            <_MenuItem
              icon={Copy}
              label="Copy Metadata"
              onClick={() => onMenuAction(onMetadata)}
            />
          </div>
        )}
        {onClose && (
          <>
            {(onEdit ?? onDelete ?? hasMultipleDeleteActions) && (
              <div className="h-px bg-neutral-200 dark:bg-neutral-800" />
            )}
            <div onClick={(e) => e.stopPropagation()}>
              <_MenuItem
                icon={X}
                label="Close"
                onClick={() => onMenuAction(onClose)}
              />
            </div>
          </>
        )}
      </div>
    </Portal>
  );
}
