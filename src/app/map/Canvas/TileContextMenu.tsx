"use client";

import { useEffect, useRef, useState } from "react";
import type { TileData } from "../types/tile-data";
import { 
  Eye, 
  Maximize2, 
  Navigation, 
  Edit, 
  Trash2, 
  Move,
  Plus
} from "lucide-react";

interface TileContextMenuProps {
  tileData: TileData;
  position: { x: number; y: number };
  onClose: () => void;
  onSelect?: () => void;
  onExpand?: () => void;
  onNavigate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCreate?: () => void;
  canEdit: boolean;
  isEmptyTile?: boolean;
}

export function TileContextMenu({
  tileData,
  position,
  onClose,
  onSelect,
  onExpand,
  onNavigate,
  onEdit,
  onDelete,
  onCreate,
  canEdit,
  isEmptyTile = false,
}: TileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Adjust position to keep menu on screen
  useEffect(() => {
    if (!menuRef.current) return;
    
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let newX = position.x;
    let newY = position.y;
    
    // Adjust if menu goes off right edge
    if (position.x + rect.width > viewportWidth) {
      newX = viewportWidth - rect.width - 10;
    }
    
    // Adjust if menu goes off bottom edge
    if (position.y + rect.height > viewportHeight) {
      newY = viewportHeight - rect.height - 10;
    }
    
    setAdjustedPosition({ x: newX, y: newY });
  }, [position]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  interface MenuItem {
    icon: typeof Eye;
    label: string;
    shortcut: string;
    onClick: () => void;
    separator?: boolean;
    className?: string;
  }

  const menuItems: MenuItem[] = isEmptyTile ? [
    onCreate && canEdit ? {
      icon: Plus,
      label: "Create Tile",
      shortcut: "Hover",
      onClick: onCreate,
    } : null,
  ].filter((item): item is MenuItem => item !== null) : [
    onSelect ? {
      icon: Eye,
      label: "Preview",
      shortcut: "Click",
      onClick: onSelect,
    } : null,
    onExpand ? {
      icon: Maximize2,
      label: tileData.state?.isExpanded ? "Collapse" : "Expand",
      shortcut: "Double-click",
      onClick: onExpand,
    } : null,
    onNavigate ? {
      icon: Navigation,
      label: "Navigate",
      shortcut: "Ctrl+Click",
      onClick: onNavigate,
    } : null,
    canEdit && onEdit ? {
      icon: Edit,
      label: "Edit",
      shortcut: "",
      onClick: onEdit,
      separator: true,
    } : null,
    canEdit ? {
      icon: Move,
      label: "Move",
      shortcut: "Drag",
      onClick: onClose, // Just close menu, drag is always enabled
    } : null,
    canEdit && onDelete ? {
      icon: Trash2,
      label: "Delete",
      shortcut: "",
      onClick: onDelete,
      className: "text-[color:var(--destructive-color-600)] dark:text-[color:var(--destructive-color-400)]",
    } : null,
  ].filter((item): item is MenuItem => item !== null);

  if (menuItems.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] rounded-lg border border-[color:var(--stroke-color-200)] dark:border-[color:var(--stroke-color-700)] bg-[color:var(--bg-color-0)] dark:bg-[color:var(--bg-color-800)] shadow-lg py-1"
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
    >
      {menuItems.map((item, index) => {
        if (!item) return null;
        const Icon = item.icon;
        
        return (
          <div key={index}>
            {item.separator && index > 0 && (
              <div className="my-1 border-t border-[color:var(--stroke-color-200)] dark:border-[color:var(--stroke-color-700)]" />
            )}
            <button
              className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[color:var(--bg-color-100)] dark:hover:bg-[color:var(--bg-color-700)] transition-colors ${
                item.className || "text-[color:var(--text-color-700)] dark:text-[color:var(--text-color-300)]"
              }`}
              onClick={() => {
                item.onClick();
                onClose();
              }}
            >
              <span className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {item.label}
              </span>
              {item.shortcut && (
                <span className="text-xs text-[color:var(--text-color-500)] dark:text-[color:var(--text-color-400)] ml-4">
                  {item.shortcut}
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}