"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MenuItem } from "~/app/map/Canvas/_internals/menu/items-builder";

interface MenuItemButtonProps {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  onClick?: () => void;
  onClose: () => void;
  className?: string;
  separator?: boolean;
  showSeparator?: boolean;
  submenu?: MenuItem[];
}

export function MenuItemButton({
  icon: Icon,
  label,
  shortcut,
  onClick,
  onClose,
  className,
  separator,
  showSeparator = false,
  submenu,
}: MenuItemButtonProps) {
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const hasSubmenu = submenu && submenu.length > 0;

  // Position submenu to the right, but flip to left if it would overflow
  useEffect(() => {
    if (isSubmenuOpen && submenuRef.current && itemRef.current) {
      const submenuRect = submenuRef.current.getBoundingClientRect();
      const itemRect = itemRef.current.getBoundingClientRect();

      // Check if submenu would overflow the right edge of the viewport
      if (itemRect.right + submenuRect.width > window.innerWidth) {
        submenuRef.current.style.left = "auto";
        submenuRef.current.style.right = "100%";
      } else {
        submenuRef.current.style.left = "100%";
        submenuRef.current.style.right = "auto";
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

  const handleMouseEnter = () => {
    if (hasSubmenu) {
      setIsSubmenuOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (hasSubmenu) {
      setIsSubmenuOpen(false);
    }
  };

  return (
    <div
      ref={itemRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {separator && showSeparator && (
        <div className="my-1 border-t border-[color:var(--stroke-color-200)] dark:border-[color:var(--stroke-color-700)]" />
      )}
      <button
        className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[color:var(--bg-color-100)] dark:hover:bg-[color:var(--bg-color-700)] transition-colors ${
          className ?? "text-[color:var(--text-color-700)] dark:text-[color:var(--text-color-300)]"
        }`}
        onClick={handleClick}
      >
        <span className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {label}
        </span>
        {hasSubmenu ? (
          <ChevronRight className="w-4 h-4 text-[color:var(--text-color-500)] dark:text-[color:var(--text-color-400)]" />
        ) : shortcut ? (
          <span className="text-xs text-[color:var(--text-color-500)] dark:text-[color:var(--text-color-400)] ml-4">
            {shortcut}
          </span>
        ) : null}
      </button>

      {/* Submenu */}
      {hasSubmenu && isSubmenuOpen && (
        <div
          ref={submenuRef}
          className="absolute top-0 left-full min-w-[180px] rounded-lg border border-[color:var(--stroke-color-200)] dark:border-[color:var(--stroke-color-700)] bg-white dark:bg-neutral-800 shadow-lg py-1 z-50"
        >
          {submenu.map((subItem, subIndex) => (
            <MenuItemButton
              key={subIndex}
              icon={subItem.icon}
              label={subItem.label}
              shortcut={subItem.shortcut}
              onClick={subItem.onClick}
              onClose={onClose}
              className={subItem.className}
              separator={subItem.separator}
              showSeparator={subIndex > 0}
              submenu={subItem.submenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}
