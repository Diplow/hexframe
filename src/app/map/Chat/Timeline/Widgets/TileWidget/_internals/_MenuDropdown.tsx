'use client';

import { Edit, Trash2, X, Copy } from 'lucide-react';
import { Portal } from '~/app/map/Chat/Timeline/Widgets/Portal';
import { _MenuItem } from '~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/_MenuItem';
import type { RefObject } from 'react';

interface MenuDropdownProps {
  menuRef: RefObject<HTMLDivElement>;
  menuPosition: { top: number; left: number };
  onEdit?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  onMetadata?: () => void;
  onMenuAction: (action: (() => void) | undefined) => void;
}

export function _MenuDropdown({
  menuRef,
  menuPosition,
  onEdit,
  onDelete,
  onClose,
  onMetadata,
  onMenuAction,
}: MenuDropdownProps) {
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
        {onDelete && (
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
            {(onEdit ?? onDelete) && (
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
