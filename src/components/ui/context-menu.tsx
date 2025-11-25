'use client';

import { useState, useRef, useEffect, useLayoutEffect, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '~/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface ContextMenuItemData {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  onClick?: () => void;
  variant?: 'default' | 'destructive';
  separator?: boolean;
  submenu?: ContextMenuItemData[];
}

interface ContextMenuProps {
  position: { x: number; y: number };
  items: ContextMenuItemData[];
  onClose: () => void;
  className?: string;
}

interface ContextMenuItemProps {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  onClick?: () => void;
  variant?: 'default' | 'destructive';
  separator?: boolean;
  submenu?: ContextMenuItemData[];
  onClose: () => void;
  showSeparator?: boolean;
}

// ============================================================================
// Portal Component
// ============================================================================

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return null;
  }

  let root = document.getElementById('portal-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'portal-root';
    document.body.appendChild(root);
  }

  return createPortal(children, root);
}

// ============================================================================
// Positioning Hook
// ============================================================================

function useMenuPositioning(
  menuRef: React.RefObject<HTMLDivElement | null>,
  position: { x: number; y: number }
): { x: number; y: number; isPositioned: boolean } {
  const [adjustedPosition, setAdjustedPosition] = useState({ ...position, isPositioned: false });
  const [mounted, setMounted] = useState(false);

  // Track when component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate position after mount when ref is available
  useLayoutEffect(() => {
    if (!mounted || !menuRef.current) {
      return;
    }

    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newX = position.x;
    let newY = position.y;

    // Adjust horizontal position if menu would overflow right edge
    if (position.x + menuRect.width > viewportWidth) {
      newX = viewportWidth - menuRect.width - 8;
    }

    // Show menu above click position if in bottom half of screen
    const isInBottomHalf = position.y > viewportHeight / 2;
    if (isInBottomHalf) {
      newY = position.y - menuRect.height;
    }

    // Ensure menu stays within viewport bounds
    if (newY < 8) {
      newY = 8;
    }
    if (newY + menuRect.height > viewportHeight - 8) {
      newY = viewportHeight - menuRect.height - 8;
    }

    setAdjustedPosition({ x: newX, y: newY, isPositioned: true });
  }, [mounted, menuRef, position]);

  return adjustedPosition;
}

// ============================================================================
// Context Menu Item
// ============================================================================

function ContextMenuItem({
  icon: Icon,
  label,
  shortcut,
  onClick,
  variant = 'default',
  separator,
  submenu,
  onClose,
  showSeparator = false,
}: ContextMenuItemProps) {
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const hasSubmenu = submenu && submenu.length > 0;

  const variantClass = variant === 'destructive'
    ? 'text-[color:var(--destructive-color-600)] dark:text-[color:var(--destructive-color-400)]'
    : '';

  // Position submenu to avoid overflow
  useEffect(() => {
    if (isSubmenuOpen && submenuRef.current && itemRef.current) {
      const submenuRect = submenuRef.current.getBoundingClientRect();
      const itemRect = itemRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Horizontal positioning
      if (itemRect.right + submenuRect.width > window.innerWidth) {
        submenuRef.current.style.left = 'auto';
        submenuRef.current.style.right = '100%';
      } else {
        submenuRef.current.style.left = '100%';
        submenuRef.current.style.right = 'auto';
      }

      // Vertical positioning - show above if in bottom half of screen
      const isInBottomHalf = itemRect.top > viewportHeight / 2;
      if (isInBottomHalf) {
        submenuRef.current.style.top = 'auto';
        submenuRef.current.style.bottom = '0';
      } else {
        submenuRef.current.style.top = '0';
        submenuRef.current.style.bottom = 'auto';
      }
    }
  }, [isSubmenuOpen]);

  const handleClick = () => {
    if (hasSubmenu) {
      setIsSubmenuOpen(!isSubmenuOpen);
    } else if (onClick) {
      onClick();
      onClose();
    }
  };

  return (
    <div
      ref={itemRef}
      className="relative"
      onMouseEnter={() => hasSubmenu && setIsSubmenuOpen(true)}
      onMouseLeave={() => hasSubmenu && setIsSubmenuOpen(false)}
    >
      {separator && showSeparator && (
        <div className="h-px bg-neutral-200 dark:bg-neutral-800" />
      )}
      <button
        type="button"
        className={cn(
          'flex items-center justify-between gap-2 w-full px-3 py-2 text-sm whitespace-nowrap',
          'hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors',
          variantClass
        )}
        onClick={handleClick}
      >
        <span className="flex items-center gap-2">
          <Icon className="h-3 w-3 shrink-0" />
          {label}
        </span>
        {hasSubmenu ? (
          <ChevronRight className="h-3 w-3 text-neutral-500" />
        ) : shortcut ? (
          <span className="text-xs text-neutral-500 ml-4">
            {shortcut}
          </span>
        ) : null}
      </button>

      {hasSubmenu && isSubmenuOpen && (
        <div
          ref={submenuRef}
          className="absolute top-0 left-full min-w-[140px] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg z-50"
        >
          {submenu.map((subItem, index) => (
            <ContextMenuItem
              key={index}
              icon={subItem.icon}
              label={subItem.label}
              shortcut={subItem.shortcut}
              onClick={subItem.onClick}
              variant={subItem.variant}
              separator={subItem.separator}
              submenu={subItem.submenu}
              onClose={onClose}
              showSeparator={index > 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Context Menu Container
// ============================================================================

const ContextMenuContainer = forwardRef<HTMLDivElement, {
  position: { x: number; y: number };
  isPositioned: boolean;
  children: React.ReactNode;
  className?: string;
}>(({ position, isPositioned, children, className }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'fixed z-50 min-w-[120px] rounded-md',
        'border border-neutral-200 dark:border-neutral-800',
        'bg-white dark:bg-neutral-900 shadow-lg',
        !isPositioned && 'opacity-0',
        className
      )}
      style={{ left: position.x, top: position.y }}
    >
      {children}
    </div>
  );
});

ContextMenuContainer.displayName = 'ContextMenuContainer';

// ============================================================================
// Main Context Menu Component
// ============================================================================

export function ContextMenu({
  position,
  items,
  onClose,
  className,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const adjustedPosition = useMenuPositioning(menuRef, position);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  if (items.length === 0) return null;

  return (
    <Portal>
      <ContextMenuContainer
        ref={menuRef}
        position={adjustedPosition}
        isPositioned={adjustedPosition.isPositioned}
        className={className}
      >
        {items.map((item, index) => (
          <ContextMenuItem
            key={index}
            icon={item.icon}
            label={item.label}
            shortcut={item.shortcut}
            onClick={item.onClick}
            variant={item.variant}
            separator={item.separator}
            submenu={item.submenu}
            onClose={onClose}
            showSeparator={index > 0}
          />
        ))}
      </ContextMenuContainer>
    </Portal>
  );
}

// Re-export for convenience
export { Portal, ContextMenuItem, ContextMenuContainer };
