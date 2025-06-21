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
}

export function useTileInteraction({
  tileData,
  coordId: _coordId,
  type,
  onNavigate,
  onExpand,
  onEdit,
  onDelete,
  onCreate,
}: TileInteractionProps) {
  const { activeTool, onTileClick } = useTileActions();

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Prevent default behavior
    e.preventDefault();
    e.stopPropagation();

    // Only notify context if we have tile data
    if (tileData) {
      onTileClick(tileData);
    }

    // Then handle tool-specific behavior
    switch (activeTool) {
      case 'navigate':
        if (type === 'item' && onNavigate) {
          onNavigate();
        }
        break;
      case 'expand':
        if (type === 'item' && onExpand) {
          // Check if tile can be expanded
          if (tileData && 'state' in tileData && tileData.state.canExpand !== false) {
            onExpand();
          }
        }
        break;
      case 'create':
        if (type === 'empty' && onCreate) {
          onCreate();
        }
        break;
      case 'edit':
        if (type === 'item' && onEdit) {
          onEdit();
        }
        break;
      case 'delete':
        if (type === 'item' && onDelete) {
          onDelete();
        }
        break;
      case 'select':
        // Select tool doesn't have a default action
        break;
      case 'drag':
        // Drag tool is handled by drag events, not click
        break;
    }
  }, [activeTool, onCreate, onDelete, onEdit, onExpand, onNavigate, onTileClick, tileData, type]);

  // Get cursor based on tool and tile type
  const getCursor = useCallback((): TileCursor => {
    if (activeTool === 'navigate' && type === 'item') {
      return 'cursor-pointer';
    }
    if (activeTool === 'expand' && type === 'item') {
      // Check if tile can be expanded
      if (tileData && 'state' in tileData && tileData.state.canExpand === false) {
        return 'cursor-not-allowed';
      }
      // Check if tile is already expanded
      if (tileData && 'state' in tileData && tileData.state.isExpanded) {
        return 'cursor-zoom-out';
      }
      return 'cursor-zoom-in';
    }
    if (activeTool === 'create' && type === 'empty') {
      return 'cursor-cell';
    }
    if (activeTool === 'edit' && type === 'item') {
      return 'cursor-text';
    }
    if (activeTool === 'delete' && type === 'item') {
      return 'cursor-crosshair';
    }
    if (activeTool === 'select') {
      return 'cursor-pointer';
    }
    if (activeTool === 'drag' && type === 'item') {
      // Check if user can edit (owns) the tile
      if (tileData && 'state' in tileData && tileData.state.canEdit === false) {
        return 'cursor-not-allowed';
      }
      return 'cursor-move';
    }
    return 'cursor-pointer';
  }, [activeTool, type, tileData]);

  // Determine if tile should show hover effects
  const shouldShowHoverEffects = useCallback(() => {
    if (activeTool === 'navigate' && type === 'item') return true;
    if (activeTool === 'expand' && type === 'item') return true;
    if (activeTool === 'create' && type === 'empty') return true;
    if (activeTool === 'edit' && type === 'item') return true;
    if (activeTool === 'delete' && type === 'item') return true;
    if (activeTool === 'drag' && type === 'item') return true;
    return false;
  }, [activeTool, type]);

  return {
    handleClick,
    cursor: getCursor(),
    shouldShowHoverEffects: shouldShowHoverEffects(),
    activeTool,
  };
}