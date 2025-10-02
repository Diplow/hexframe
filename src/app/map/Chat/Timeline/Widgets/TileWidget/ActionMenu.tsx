'use client';

import { useState, useEffect, useRef } from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { _MenuDropdown } from '~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/_MenuDropdown';

interface ActionMenuProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  onMetadata?: () => void;
}

export function ActionMenu({ onEdit, onDelete, onClose, onMetadata }: ActionMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const hasActions = onEdit ?? onDelete ?? onClose ?? onMetadata;

  // Handle click outside to close menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMenu]);

  const _calculateMenuPosition = () => {
    if (!menuButtonRef.current) return null;
    
    const rect = menuButtonRef.current.getBoundingClientRect();
    const menuWidth = 120; // Approximate menu width
    const menuHeight = 80; // Approximate menu height
    
    // Calculate position
    let top = rect.bottom + 4;
    let left = rect.right - menuWidth;
    
    // Check if menu would go off bottom of screen
    if (top + menuHeight > window.innerHeight) {
      top = rect.top - menuHeight - 4;
    }
    
    // Check if menu would go off left edge
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

  const _handleMenuAction = (action: (() => void) | undefined) => {
    setShowMenu(false);
    if (action) {
      action();
    }
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
          menuRef={menuRef}
          menuPosition={menuPosition}
          onEdit={onEdit}
          onDelete={onDelete}
          onClose={onClose}
          onMetadata={onMetadata}
          onMenuAction={_handleMenuAction}
        />
      )}
    </>
  );
}