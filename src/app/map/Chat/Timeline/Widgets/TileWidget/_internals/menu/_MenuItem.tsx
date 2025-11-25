'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface MenuItemData {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'destructive';
  submenu?: MenuItemData[];
}

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'destructive';
  submenu?: MenuItemData[];
  onCloseMenu?: () => void;
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  submenu,
  onCloseMenu,
}: MenuItemProps) {
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const hasSubmenu = submenu && submenu.length > 0;

  const colorClass = variant === 'destructive'
    ? 'text-[color:var(--destructive-color-600)] dark:text-[color:var(--destructive-color-400)]'
    : '';

  // Position submenu to avoid overflow
  useEffect(() => {
    if (isSubmenuOpen && submenuRef.current && itemRef.current) {
      const submenuRect = submenuRef.current.getBoundingClientRect();
      const itemRect = itemRef.current.getBoundingClientRect();

      if (itemRect.right + submenuRect.width > window.innerWidth) {
        submenuRef.current.style.left = 'auto';
        submenuRef.current.style.right = '100%';
      } else {
        submenuRef.current.style.left = '100%';
        submenuRef.current.style.right = 'auto';
      }
    }
  }, [isSubmenuOpen]);

  const handleClick = () => {
    if (hasSubmenu) {
      setIsSubmenuOpen(!isSubmenuOpen);
    } else if (onClick) {
      onClick();
      onCloseMenu?.();
    }
  };

  return (
    <div
      ref={itemRef}
      className="relative"
      onMouseEnter={() => hasSubmenu && setIsSubmenuOpen(true)}
      onMouseLeave={() => hasSubmenu && setIsSubmenuOpen(false)}
    >
      <button
        type="button"
        className={`flex items-center justify-between gap-2 w-full px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${colorClass}`}
        onClick={handleClick}
      >
        <span className="flex items-center gap-2">
          <Icon className="h-3 w-3" />
          {label}
        </span>
        {hasSubmenu && (
          <ChevronRight className="h-3 w-3 text-neutral-500" />
        )}
      </button>

      {hasSubmenu && isSubmenuOpen && (
        <div
          ref={submenuRef}
          className="absolute top-0 left-full min-w-[140px] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg z-50"
        >
          {submenu.map((subItem, index) => (
            <MenuItem
              key={index}
              icon={subItem.icon}
              label={subItem.label}
              onClick={subItem.onClick}
              variant={subItem.variant}
              submenu={subItem.submenu}
              onCloseMenu={onCloseMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Re-export with underscore prefix to maintain internal naming convention
export { MenuItem as _MenuItem };
