"use client";

import { useEffect, useRef } from "react";
import type { TileData } from "~/app/map/types/tile-data";
import { useMenuPositioning } from "~/app/map/Canvas/_internals/menu/positioning";
import { buildMenuItems } from "~/app/map/Canvas/_internals/menu/items-builder";
import { MenuItemButton } from "~/app/map/Canvas/_components/menu/MenuItemButton";

interface TileContextMenuProps {
  tileData: TileData;
  position: { x: number; y: number };
  onClose: () => void;
  onSelect?: () => void;
  onExpand?: () => void;
  onNavigate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDeleteChildren?: () => void;
  onDeleteComposed?: () => void;
  onDeleteExecutionHistory?: () => void;
  onCreate?: () => void;
  onCompositionToggle?: (tileData: TileData) => void;
  onViewHistory?: () => void;
  onCopy?: () => void;
  onMove?: () => void;
  canEdit: boolean;
  isEmptyTile?: boolean;
  hasComposition?: boolean;
  isCompositionExpanded?: boolean;
  canShowComposition?: boolean;
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
  onDeleteChildren,
  onDeleteComposed,
  onDeleteExecutionHistory,
  onCreate,
  onCompositionToggle,
  onViewHistory,
  onCopy,
  onMove,
  canEdit,
  isEmptyTile = false,
  hasComposition: _hasComposition = false,
  isCompositionExpanded = false,
  canShowComposition = false,
}: TileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const adjustedPosition = useMenuPositioning(menuRef, position);

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

  const menuItems = buildMenuItems({
    tileData,
    canEdit,
    isEmptyTile,
    isCompositionExpanded,
    canShowComposition,
    onSelect,
    onExpand,
    onNavigate,
    onEdit,
    onDelete,
    onDeleteChildren,
    onDeleteComposed,
    onDeleteExecutionHistory,
    onCreate,
    onCompositionToggle,
    onViewHistory,
    onCopy,
    onMove,
  });

  if (menuItems.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] rounded-lg border border-[color:var(--stroke-color-200)] dark:border-[color:var(--stroke-color-700)] bg-white dark:bg-neutral-800 shadow-lg py-1"
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
    >
      {menuItems.map((item, index) => {
        if (!item) return null;

        return (
          <MenuItemButton
            key={index}
            icon={item.icon}
            label={item.label}
            shortcut={item.shortcut}
            onClick={item.onClick}
            onClose={onClose}
            className={item.className}
            separator={item.separator}
            showSeparator={index > 0}
            submenu={item.submenu}
          />
        );
      })}
    </div>
  );
}