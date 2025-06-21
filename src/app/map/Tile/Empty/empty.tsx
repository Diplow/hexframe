"use client";

import { useState, useContext } from "react";
import { StaticBaseTileLayout, type TileScale, type TileColor } from "~/app/static/map/Tile/Base/base";
import { CreateItemModal } from "../../Dialogs/create-item.modal";
import { DynamicCreateItemDialog } from "../../Dialogs/create-item";
import { LegacyTileActionsContext } from "../../Canvas";
import type { URLInfo } from "../../types/url-info";
import { CoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";
import { getColor } from "../../types/tile-data";
import { getDefaultStroke } from "../utils/stroke";
import { useTileInteraction } from "../../hooks/useTileInteraction";

interface DynamicEmptyTileProps {
  coordId: string;
  scale?: TileScale;
  baseHexSize?: number;
  urlInfo: URLInfo;
  parentItem?: { id: string; name: string };
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
  const [showModal, setShowModal] = useState(false);
  const [useDynamicDialog] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  
  // Calculate default stroke for this scale
  const defaultStroke = getDefaultStroke(props.scale ?? 1, false);
  
  // Use tile interaction hook for tool-based behavior
  const { handleClick, cursor, shouldShowHoverEffects } = useTileInteraction({
    coordId: props.coordId,
    type: 'empty',
    onCreate: () => {
      setShowModal(true);
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



  // Handle successful creation
  const handleCreateSuccess = () => {
    setShowModal(false);
    // Don't invalidate the cache - the optimistic update handles everything
  };

  
  // Get drop handlers using helper function
  const dropProps = getDropHandlers(props.coordId, isValidDropTarget, tileActions);

  return (
    <>
      <div 
        className={`group relative hover:z-10`} 
        data-testid={`empty-tile-${props.coordId}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...dropProps}>
        {/* Invisible hover area overlay to ensure full tile responds to hover */}
        <div className="pointer-events-auto absolute inset-0 z-10" />

        <div onClick={handleClick}>
          <StaticBaseTileLayout
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
        >
          <div className="absolute inset-0">
            {/* Semi-transparent black overlay clipped to hexagon shape */}
            <div 
              className={`absolute inset-0 transition-colors duration-200 ${
                isHovered && shouldShowHoverEffects ? 'bg-black/10' : ''
              }`}
              style={{
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
              }}
            />
            
            {/* Content on top of the overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Green + button removed - creation is now handled via the Create tool */}
            </div>
          </div>
          </StaticBaseTileLayout>
        </div>
      </div>

      {/* Dynamic dialog with optimistic updates */}
      {showModal && useDynamicDialog && (
        <DynamicCreateItemDialog
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          coordId={props.coordId}
          parentItem={props.parentItem}
          urlInfo={props.urlInfo}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Fallback modal if dynamic dialog is not available */}
      {showModal && !useDynamicDialog && (
        <CreateItemModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          coordId={props.coordId}
          parentItem={props.parentItem}
          urlInfo={props.urlInfo}
          onSuccess={handleCreateSuccess}
          preventRedirects={true}
        />
      )}
    </>
  );
}
