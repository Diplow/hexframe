"use client";

import { useCallback } from "react";
import { useTileActions } from "~/app/map/Canvas/TileActionsContext";
import type { TileData } from "~/app/map/types";
import type { TileCursor } from "~/app/map/Canvas/Tile";
import { Visibility, MapItemType } from '~/lib/domains/mapping/utils';

interface TileInteractionProps {
  tileData?: TileData | null;
  coordId: string;
  type: 'item' | 'empty' | 'user';
  onCreate?: () => void;
  canEdit?: boolean;
  onNavigate?: () => void;
  onExpand?: () => void;
}

/** Creates minimal TileData for empty tiles to support context menu */
function _createEmptyTileData(coordId: string, canEdit: boolean): TileData {
  return {
    metadata: {
      coordId, dbId: "0", parentId: undefined,
      coordinates: { path: [], userId: "0", groupId: 0 }, ownerId: '', depth: 0,
    },
    data: {
      title: '', content: '', preview: undefined, link: '',
      color: 'gray-500', visibility: Visibility.PRIVATE, itemType: MapItemType.CONTEXT,
    },
    state: {
      canEdit, isDragged: false, isHovered: false, isSelected: false,
      isExpanded: false, canExpand: false, isDragOver: false, isHovering: false,
    },
  };
}

/** Determines cursor based on tile type and state */
function _getCursor(type: string, canEdit: boolean, tileData?: TileData | null): TileCursor {
  const isShiftPressed = document.body.hasAttribute('data-shift-pressed');

  if (type === 'empty' && canEdit) return 'cursor-cell';
  if (type === 'item' && tileData) {
    if (isShiftPressed && tileData.state?.canExpand) {
      return tileData.state.isExpanded ? 'cursor-zoom-out' : 'cursor-zoom-in';
    }
    return canEdit ? 'cursor-move' : 'cursor-pointer';
  }
  return 'cursor-pointer';
}

export function useTileInteraction({ tileData, coordId, type, onCreate, canEdit = false }: TileInteractionProps) {
  const { onTileClick, onTileRightClick } = useTileActions();

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'empty' && canEdit && onCreate) { onCreate(); return; }
    if (tileData) onTileClick(tileData, e);
  }, [canEdit, onCreate, onTileClick, tileData, type]);

  const handleRightClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (tileData) {
      onTileRightClick(tileData, e);
    } else if (type === 'empty' && canEdit) {
      onTileRightClick(_createEmptyTileData(coordId, canEdit), e);
    }
  }, [canEdit, coordId, onTileRightClick, tileData, type]);

  const shouldShowHoverEffects = type === 'item' || (type === 'empty' && canEdit);

  return {
    handleClick,
    handleRightClick,
    cursor: _getCursor(type, canEdit, tileData),
    shouldShowHoverEffects,
    canEdit,
  };
}