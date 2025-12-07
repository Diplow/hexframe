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
  visibility?: Visibility;
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
  visibility,
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
  });

  return (
    <ContextMenu
      position={position}
      items={menuItems}
      onClose={onClose}
    />
  );
}
