"use client";

import { useState, useContext, useEffect } from "react";
import { DynamicBaseTileLayout } from "../Base";
import type { TileScale, TileColor } from "~/app/map/Canvas/Tile/Base/BaseTileLayout";
import { LegacyTileActionsContext, useCanvasTheme } from "~/app/map/Canvas";
import type { URLInfo } from "~/app/map/types/url-info";
import { CoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";
import { getColor } from "~/app/map/types/tile-data";
import { getDefaultStroke } from "../utils/stroke";
import { useTileInteraction } from "~/app/map/Canvas/hooks/shared/useTileInteraction";
import { loggers } from "~/lib/debug/debug-logger";
import { useEventBus } from "~/app/map/Services/EventBus/event-bus-context";

export interface DynamicEmptyTileProps {
  coordId: string;
  scale?: TileScale;
  baseHexSize?: number;
  urlInfo: URLInfo;
  parentItem?: { id: string; name: string; ownerId?: string };
  interactive?: boolean;
  currentUserId?: number;
}

function getDropHandlers(
  coordId: string,
  isValidDropTarget: boolean,
  tileActions: React.ContextType<typeof LegacyTileActionsContext>
) {
  if (!isValidDropTarget || !tileActions) {
    return {};
  }
  
  return {
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
      tileActions.dragHandlers.onDragOver(coordId, e);
    },
    onDragLeave: tileActions.dragHandlers.onDragLeave,
    onDrop: (e: React.DragEvent<HTMLDivElement>) => {
      tileActions.dragHandlers.onDrop(coordId, e);
    },
  };
}

export function DynamicEmptyTile(props: DynamicEmptyTileProps) {
  const [isHovered, setIsHovered] = useState(false);
  const eventBus = useEventBus();
  const { isDarkMode } = useCanvasTheme();
  
  // Log empty tile render
  useEffect(() => {
    loggers.render.canvas('DynamicEmptyTile render', {
      coordId: props.coordId,
      scale: props.scale ?? 1,
      hasParent: !!props.parentItem,
      parentId: props.parentItem?.id,
      interactive: props.interactive ?? true,
      canEdit: props.parentItem?.ownerId && props.currentUserId 
        ? props.currentUserId.toString() === props.parentItem.ownerId.toString() 
        : false,
    });
  });
  
  // Calculate default stroke for this scale
  const defaultStroke = getDefaultStroke(props.scale ?? 1, false);
  
  // Check if user owns the parent tile (can create in this domain)
  const canEdit = props.parentItem?.ownerId && props.currentUserId 
    ? props.currentUserId.toString() === props.parentItem.ownerId.toString() 
    : false;
  
  
  // Use tile interaction hook for contextual behavior
  const { handleClick, handleDoubleClick, handleRightClick, cursor, shouldShowHoverEffects } = useTileInteraction({
    coordId: props.coordId,
    type: 'empty',
    canEdit,
    onCreate: () => {
      // Get parent coordId from child coordId
      const childCoords = CoordSystem.parseId(props.coordId);
      const parentCoords = CoordSystem.getParentCoord(childCoords);
      const parentCoordId = parentCoords ? CoordSystem.createId(parentCoords) : undefined;
      
      // Emit request event to show creation widget in Chat
      eventBus.emit({
        type: 'map.create_requested',
        source: 'canvas',
        payload: {
          coordId: props.coordId,
          parentName: props.parentItem?.name,
          parentId: props.parentItem?.id,
          parentCoordId,
        },
        timestamp: new Date(),
      });
    },
  });

  // Safely check if we're within a DynamicMapCanvas context
  const tileActions = useContext(LegacyTileActionsContext);


  
  // Check if this tile is a valid drop target
  const isValidDropTarget = tileActions?.isValidDropTarget(props.coordId) === true;
  const isDropTargetActive = tileActions?.isDropTarget(props.coordId) === true;
  const dropOperation = tileActions?.getDropOperation(props.coordId) ?? null;
  
  // Calculate the color this tile would have if something was moved here
  const targetCoords = CoordSystem.parseId(props.coordId);
  const previewColor = getColor(targetCoords);



  // Get drop handlers using helper function
  const dropProps = getDropHandlers(props.coordId, isValidDropTarget, tileActions);

  return (
    <div 
        className={`group relative hover:z-10`} 
        data-testid={`empty-tile-${props.coordId}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...dropProps}>
        
        <div>
          <DynamicBaseTileLayout
            coordId={props.coordId}
            scale={props.scale ?? 1}
            cursor={cursor}
            color={(() => {
            if (isDropTargetActive && dropOperation === 'move') {
              // Show the color the tile would have after the move
              const [colorName, tint] = previewColor.split("-");
              return {
                color: colorName as TileColor["color"],
                tint: tint as TileColor["tint"]
              };
            }
            return undefined; // No fill color for transparent tiles
          })()}
          stroke={isHovered && shouldShowHoverEffects ? defaultStroke : { color: "transparent", width: 0 }}
          baseHexSize={props.baseHexSize}
          isFocusable={true}
          isDarkMode={isDarkMode}
        >
          <div className="absolute inset-0">
            {/* Clickable area with hexagon shape */}
            <div 
              className="pointer-events-auto absolute inset-0 z-10"
              onClick={props.interactive ? (e) => void handleClick(e) : undefined}
              onDoubleClick={props.interactive ? (e) => void handleDoubleClick(e) : undefined}
              onContextMenu={props.interactive ? (e) => void handleRightClick(e) : undefined}
              style={{
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
              }}
            />
            
            {/* Semi-transparent black overlay clipped to hexagon shape */}
            <div 
              className={`absolute inset-0 transition-colors duration-200 pointer-events-none ${
                isHovered && shouldShowHoverEffects ? 'bg-black/10' : ''
              }`}
              style={{
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
              }}
            />
            
            {/* Content on top of the overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Green + button removed - creation is now handled via the Create tool */}
            </div>
          </div>
          </DynamicBaseTileLayout>
        </div>
      </div>
  );
}
