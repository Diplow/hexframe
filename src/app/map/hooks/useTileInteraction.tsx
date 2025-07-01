"use client";

import { useCallback } from "react";
import { useTileActions } from "../Canvas/TileActionsContext";
import type { TileData } from "../types/tile-data";
import type { TileCursor } from "~/app/static/map/Tile/Base/base";

interface TileInteractionProps {
  tileData?: TileData | null;
  coordId: string;
  type: 'item' | 'empty' | 'user';
  onNavigate?: () => void;
  onExpand?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCreate?: () => void;
  canEdit?: boolean; // Whether user owns/can edit this tile
}

export function useTileInteraction({
  tileData,
  coordId,
  type,
  onNavigate,
  onExpand,
  onEdit,
  onDelete,
  onCreate,
  canEdit = false,
}: TileInteractionProps) {
  const { onTileClick, onTileDoubleClick, onTileRightClick } = useTileActions();

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Prevent default behavior
    e.preventDefault();
    e.stopPropagation();

    // Handle Ctrl+click for navigation
    if ((e.ctrlKey || e.metaKey) && type === 'item' && onNavigate) {
      onNavigate();
      return;
    }

    // Regular click - notify context
    if (tileData) {
      onTileClick(tileData, e);
    } else if (type === 'empty') {
      // Create minimal tile data for empty tiles
      const emptyTileData: TileData = {
        metadata: {
          coordId,
          dbId: 0,
          parentId: undefined,
          coordinates: { path: [] },
          ownerId: '',
          depth: 0,
        },
        data: {
          name: '',
          description: '',
          url: '',
          color: 'gray-500',
        },
        state: {
          canEdit,
          isDragged: false,
          isHovered: false,
          isSelected: false,
          isExpanded: false,
          canExpand: false,
        },
      };
      onTileClick(emptyTileData, e);
    }
  }, [canEdit, coordId, onNavigate, onTileClick, tileData, type]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Double-click to expand
    if (type === 'item' && onExpand) {
      // Check if tile can be expanded
      if (tileData && 'state' in tileData && tileData.state.canExpand !== false) {
        onExpand();
      }
    }

    // Notify context
    if (tileData) {
      onTileDoubleClick(tileData);
    }
  }, [onExpand, onTileDoubleClick, tileData, type]);

  const handleRightClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Right-click for context menu
    if (tileData) {
      onTileRightClick(tileData, e);
    } else if (type === 'empty' && canEdit) {
      // Create minimal tile data for empty tiles
      const emptyTileData: TileData = {
        metadata: {
          coordId,
          dbId: 0,
          parentId: undefined,
          coordinates: { path: [] },
          ownerId: '',
          depth: 0,
        },
        data: {
          name: '',
          description: '',
          url: '',
          color: 'gray-500',
        },
        state: {
          canEdit,
          isDragged: false,
          isHovered: false,
          isSelected: false,
          isExpanded: false,
          canExpand: false,
        },
      };
      onTileRightClick(emptyTileData, e);
    }
  }, [canEdit, coordId, onTileRightClick, tileData, type]);

  // Get cursor based on interaction type
  const getCursor = useCallback((): TileCursor => {
    // For empty tiles in owned domains, show create cursor on hover
    if (type === 'empty' && canEdit) {
      return 'cursor-cell';
    }

    // For items, show appropriate cursor
    if (type === 'item') {
      // If user can edit, show move cursor for drag
      if (canEdit) {
        return 'cursor-move';
      }
      // Otherwise, pointer for interaction
      return 'cursor-pointer';
    }

    return 'cursor-pointer';
  }, [type, canEdit]);

  // Determine if tile should show hover effects
  const shouldShowHoverEffects = useCallback(() => {
    // Always show hover for items
    if (type === 'item') return true;
    // Show hover for empty tiles in owned domains
    if (type === 'empty' && canEdit) return true;
    return false;
  }, [type, canEdit]);

  return {
    handleClick,
    handleDoubleClick,
    handleRightClick,
    cursor: getCursor(),
    shouldShowHoverEffects: shouldShowHoverEffects(),
    canEdit,
  };
}