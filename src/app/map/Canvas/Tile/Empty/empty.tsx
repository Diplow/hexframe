"use client";

import { useState, useEffect } from "react";
import { DynamicBaseTileLayout } from "~/app/map/Canvas/Tile/Base";
import type { TileScale, TileColor } from "~/app/map/Canvas/Tile/Base/BaseTileLayout";
import { useCanvasTheme } from "~/app/map/Canvas";
import type { URLInfo } from "~/app/map/types";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import { getColor } from "~/app/map/types";
import { getDefaultStroke } from "~/app/map/Canvas/Tile/utils/stroke";
import { useTileInteraction } from "~/app/map/Canvas";
import { loggers } from "~/lib/debug/debug-logger";
import { useRef } from "react";

export interface DynamicEmptyTileProps {
  coordId: string;
  scale?: TileScale;
  baseHexSize?: number;
  urlInfo: URLInfo;
  parentItem?: { id: string; name: string; ownerId?: string };
  interactive?: boolean;
  currentUserId?: number;
  onCreateRequested?: (payload: {
    coordId: string;
    parentName?: string;
    parentId?: string;
    parentCoordId?: string;
  }) => void;
}


export function DynamicEmptyTile(props: DynamicEmptyTileProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { isDarkMode } = useCanvasTheme();
  const tileRef = useRef<HTMLDivElement>(null);

  const tileState = _setupTileState(props);
  const interactionHandlers = useTileInteraction({
    coordId: props.coordId,
    type: 'empty',
    canEdit: tileState.canEdit,
    onCreate: () => _handleTileCreation(props),
  });

  useEffect(() => {
    loggers.render.canvas('DynamicEmptyTile render', {
      coordId: props.coordId,
      scale: props.scale ?? 1,
      hasParent: !!props.parentItem,
      parentId: props.parentItem?.id,
      interactive: props.interactive ?? true,
      canEdit: tileState.canEdit,
    });
  });

  // Drop state will be handled by CSS classes from global service
  const dropConfig = _setupDropConfiguration(props, false, null);
  const tileLayout = _createTileLayout(props, isDarkMode, interactionHandlers, dropConfig, isHovered, tileState);

  return _renderEmptyTile(props, tileRef, isHovered, setIsHovered, tileLayout);
}

// Internal helper functions for empty tile functionality

function _setupTileState(props: DynamicEmptyTileProps) {
  const defaultStroke = getDefaultStroke(props.scale ?? 1, false);
  const canEdit = props.parentItem?.ownerId && props.currentUserId 
    ? props.currentUserId.toString() === props.parentItem.ownerId.toString() 
    : false;

  return { defaultStroke, canEdit };
}

function _handleTileCreation(props: DynamicEmptyTileProps) {
  const childCoords = CoordSystem.parseId(props.coordId);
  const parentCoords = CoordSystem.getParentCoord(childCoords);
  const parentCoordId = parentCoords ? CoordSystem.createId(parentCoords) : undefined;
  
  props.onCreateRequested?.({
    coordId: props.coordId,
    parentName: props.parentItem?.name,
    parentId: props.parentItem?.id,
    parentCoordId,
  });
}

function _setupDropConfiguration(
  props: DynamicEmptyTileProps,
  isDropTarget: boolean,
  dropOperation: 'move' | 'swap' | null
) {
  const targetCoords = CoordSystem.parseId(props.coordId);
  const previewColor = getColor(targetCoords);

  return {
    isDropTarget,
    dropOperation,
    previewColor
  };
}

function _createTileLayout(
  props: DynamicEmptyTileProps,
  isDarkMode: boolean,
  interactionHandlers: ReturnType<typeof useTileInteraction>,
  dropConfig: { isDropTarget: boolean; dropOperation: string | null; previewColor: string },
  isHovered: boolean,
  tileState: { defaultStroke: ReturnType<typeof getDefaultStroke>; canEdit: boolean }
) {
  const { cursor, shouldShowHoverEffects } = interactionHandlers;

  const tileColor = (() => {
    if (dropConfig.isDropTarget && dropConfig.dropOperation === 'move') {
      const [colorName, tint] = dropConfig.previewColor.split("-");
      return {
        color: colorName as TileColor["color"],
        tint: tint as TileColor["tint"]
      };
    }
    return undefined;
  })();

  return {
    coordId: props.coordId,
    scale: props.scale ?? 1,
    cursor,
    color: tileColor,
    stroke: isHovered && shouldShowHoverEffects ? tileState.defaultStroke : { color: "transparent" as const, width: 0 },
    baseHexSize: props.baseHexSize,
    isFocusable: true,
    isDarkMode,
    interactionHandlers,
    shouldShowHoverEffects
  };
}

function _renderEmptyTile(
  props: DynamicEmptyTileProps,
  tileRef: React.RefObject<HTMLDivElement> | null,
  isHovered: boolean,
  setIsHovered: React.Dispatch<React.SetStateAction<boolean>>,
  tileLayout: ReturnType<typeof _createTileLayout>
) {
  const { handleClick, handleDoubleClick, handleRightClick } = tileLayout.interactionHandlers;

  return (
    <div
      ref={tileRef}
      className={`group relative hover:z-10`}
      data-testid={`empty-tile-${props.coordId}`}
      data-tile-id={props.coordId}
      data-tile-owner="" // Empty tiles have no owner
      data-tile-has-content="false" // Empty tiles have no content
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div>
        <DynamicBaseTileLayout
          coordId={tileLayout.coordId}
          scale={tileLayout.scale}
          cursor={tileLayout.cursor}
          color={tileLayout.color}
          stroke={tileLayout.stroke}
          baseHexSize={tileLayout.baseHexSize}
          isFocusable={tileLayout.isFocusable}
          isDarkMode={tileLayout.isDarkMode}
        >
          <div className="absolute inset-0">
            <div 
              className="pointer-events-auto absolute inset-0 z-10"
              onClick={props.interactive ? (e) => void handleClick(e) : undefined}
              onDoubleClick={props.interactive ? (e) => void handleDoubleClick(e) : undefined}
              onContextMenu={props.interactive ? (e) => void handleRightClick(e) : undefined}
              style={{
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
              }}
            />
            
            <div 
              className={`absolute inset-0 transition-colors duration-200 pointer-events-none ${
                isHovered && tileLayout.shouldShowHoverEffects ? 'bg-black/10' : ''
              }`}
              style={{
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
              }}
            />
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Green + button removed - creation is now handled via the Create tool */}
            </div>
          </div>
        </DynamicBaseTileLayout>
      </div>
    </div>
  );
}
