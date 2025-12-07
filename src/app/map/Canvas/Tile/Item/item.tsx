"use client";

import type { TileData } from "~/app/map/types/tile-data";
import type { URLInfo } from "~/app/map/types/url-info";
import type { TileScale } from "~/app/map/Canvas/Tile/Base";
import { useItemState } from "~/app/map/Canvas/Tile/Item/_internals/hooks";
import { ItemTileContent } from "~/app/map/Canvas/Tile/Item/_components/item-tile-content";
import { useEffect } from "react";
import { loggers } from "~/lib/debug/debug-logger";
import { calculateTileDimensions } from "~/app/map/Canvas/Tile/utils/dimensions";
import type { Visibility } from "~/lib/domains/mapping/utils";

export interface DynamicItemTileProps {
  item: TileData;
  scale?: TileScale;
  baseHexSize?: number;
  allExpandedItemIds: string[];
  hasChildren: boolean;
  isCenter?: boolean;
  urlInfo: URLInfo;
  interactive?: boolean;
  currentUserId?: string;
  isSelected?: boolean;
  parentVisibility?: Visibility; // Parent's visibility for comparison
  onNavigate?: (coordId: string) => void;
  onToggleExpansion?: (itemId: string, coordId: string) => void;
}

export const DynamicItemTile = (props: DynamicItemTileProps) => {
  const {
    item,
    scale = 1,
    baseHexSize = 50,
    allExpandedItemIds,
    hasChildren,
    isCenter = false,
    interactive = true,
    currentUserId,
  } = props;

  const state = useItemState({
    item,
    currentUserId,
    interactive,
    allExpandedItemIds,
    hasChildren,
    isCenter,
    scale,
  });
  
  // Calculate dimensions based on scale (same calculation as BaseTileLayout)
  const { width, height } = calculateTileDimensions(scale, baseHexSize);

  // Log tile render
  useEffect(() => {
    loggers.render.canvas('DynamicItemTile render', {
      coordId: item.metadata.coordId,
      dbId: item.metadata.dbId,
      name: item.data.title,
      scale,
      isCenter,
      hasChildren,
      isExpanded: allExpandedItemIds.includes(item.metadata.dbId),
      isSelected: props.isSelected,
      interactive,
      canEdit: state.canEdit,
      // Removed isBeingDragged as it's now handled by CSS
    });
  });

  return (
    <>
      <div
        ref={state.tileRef}
        className="group relative select-none"
        data-testid={state.testId}
        style={{
          width,
          height,
          // Container has no pointer events - hexagon shapes handle all interactions
          pointerEvents: 'none'
        }}
      >
        <ItemTileContent
          {...props}
          scale={scale}
          baseHexSize={baseHexSize}
          isCenter={isCenter}
          interactive={interactive}
          tileColor={state.tileColor}
          testId={state.testId}
          canEdit={state.canEdit}
          isSelected={props.isSelected}
          // Pass drag props to be applied to clipped hexagon area
          dragProps={state.dragProps}
          dataAttributes={state.dataAttributes}
          hasOperationPending={state.hasOperationPending}
          operationType={state.operationType}
        />
      </div>
    </>
  );
};