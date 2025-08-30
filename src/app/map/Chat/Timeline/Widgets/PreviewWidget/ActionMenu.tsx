'use client';

import { useState, useEffect, useRef } from 'react';
import { MoreVertical, Edit, Trash2, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Portal } from '~/app/map/Chat/Timeline/Widgets/Portal';

interface ActionMenuProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
}

export function ActionMenu({ onEdit, onDelete, onClose }: ActionMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const hasActions = onEdit ?? onDelete ?? onClose;

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
        <Portal>
          <div 
            ref={menuRef}
            className="fixed z-50 min-w-[120px] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            {onEdit && (
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  _handleMenuAction(onEdit);
                }}
              >
                <Edit className="h-3 w-3" />
                Edit
              </button>
            )}
            {onDelete && (
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-[color:var(--destructive-color-600)] dark:text-[color:var(--destructive-color-400)]"
                onClick={(e) => {
                  e.stopPropagation();
                  _handleMenuAction(onDelete);
                }}
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            )}
            {onClose && (
              <>
                {(onEdit ?? onDelete) && (
                  <div className="h-px bg-neutral-200 dark:bg-neutral-800" />
                )}
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    _handleMenuAction(onClose);
                  }}
                >
                  <X className="h-3 w-3" />
                  Close
                </button>
              </>
            )}
          </div>
        </Portal>
      )}
    </>
  );
}