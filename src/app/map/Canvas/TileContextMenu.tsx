"use client";

import type { TileData } from "~/app/map/types/tile-data";
import { ContextMenu } from "~/components/ui/context-menu";
import { buildMenuItems } from "~/app/map/Canvas/_internals/menu/items-builder";
import type { Visibility } from '~/lib/domains/mapping/utils';

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
  onCopyCoordinates?: () => void;
  onSetVisibility?: (visibility: Visibility) => void;
  onSetVisibilityWithDescendants?: (visibility: Visibility) => void;
  /** Callback when user selects "Add to Favorites" from the context menu */
  onAddFavorite?: () => void;
  /** Callback when user selects "Remove from Favorites" from the context menu */
  onRemoveFavorite?: () => void;
  /** Callback when user selects "Edit Shortcut" from the context menu (opens favorites panel) */
  onEditShortcut?: () => void;
  visibility?: Visibility;
  /** Whether this tile is currently in the user's favorites list */
  isFavorited?: boolean;
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
  onCopyCoordinates,
  onSetVisibility,
  onSetVisibilityWithDescendants,
  onAddFavorite,
  onRemoveFavorite,
  onEditShortcut,
  visibility,
  isFavorited,
  canEdit,
  isEmptyTile = false,
  hasComposition: _hasComposition = false,
  isCompositionExpanded = false,
  canShowComposition = false,
}: TileContextMenuProps) {
  const menuItems = buildMenuItems({
    tileData,
    canEdit,
    isEmptyTile,
    isCompositionExpanded,
    canShowComposition,
    visibility,
    isFavorited,
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
    onCopyCoordinates,
    onSetVisibility,
    onSetVisibilityWithDescendants,
    onAddFavorite,
    onRemoveFavorite,
    onEditShortcut,
  });

  return (
    <ContextMenu
      position={position}
      items={menuItems}
      onClose={onClose}
    />
  );
}
