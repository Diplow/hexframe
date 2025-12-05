'use client';

import { useState, useRef } from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { _MenuDropdown } from '~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/menu/_MenuDropdown';
import { type Visibility } from '~/lib/domains/mapping/utils';

interface ActionMenuProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onDeleteChildren?: () => void;
  onDeleteComposed?: () => void;
  onDeleteExecutionHistory?: () => void;
  onClose?: () => void;
  onCopyCoordinates?: () => void;
  onHistory?: () => void;
  visibility?: Visibility;
  onToggleVisibility?: () => void;
}

export function ActionMenu({
  onEdit,
  onDelete,
  onDeleteChildren,
  onDeleteComposed,
  onDeleteExecutionHistory,
  onClose,
  onCopyCoordinates,
  onHistory,
  visibility,
  onToggleVisibility,
}: ActionMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const hasActions = onEdit ?? onDelete ?? onDeleteChildren ?? onDeleteComposed ?? onDeleteExecutionHistory ?? onClose ?? onCopyCoordinates ?? onHistory ?? onToggleVisibility;

  const _calculateMenuPosition = () => {
    if (!menuButtonRef.current) return null;

    const rect = menuButtonRef.current.getBoundingClientRect();
    const menuWidth = 120;
    const menuHeight = 80;

    let top = rect.bottom + 4;
    let left = rect.right - menuWidth;

    if (top + menuHeight > window.innerHeight) {
      top = rect.top - menuHeight - 4;
    }

    if (left < 0) {
      left = rect.left;
    }

    return { top, left };
  };

  const _handleMenuToggle = () => {
    if (!showMenu) {
      const position = _calculateMenuPosition();
      if (position) {
        setMenuPosition(position);
      }
    }
    setShowMenu(!showMenu);
  };

  const _handleMenuClose = () => {
    setShowMenu(false);
  };

  if (!hasActions) {
    return null;
  }

  return (
    <>
      <Button
        ref={menuButtonRef}
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        aria-label="More options"
        onClick={(e) => {
          e.stopPropagation();
          _handleMenuToggle();
        }}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>

      {showMenu && menuPosition && (
        <_MenuDropdown
          menuPosition={menuPosition}
          onEdit={onEdit}
          onDelete={onDelete}
          onDeleteChildren={onDeleteChildren}
          onDeleteComposed={onDeleteComposed}
          onDeleteExecutionHistory={onDeleteExecutionHistory}
          onClose={onClose}
          onCopyCoordinates={onCopyCoordinates}
          onHistory={onHistory}
          onMenuClose={_handleMenuClose}
          visibility={visibility}
          onToggleVisibility={onToggleVisibility}
        />
      )}
    </>
  );
}
