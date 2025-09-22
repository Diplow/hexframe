"use client";

import type { TileData } from "~/app/map/types/tile-data";
import type { URLInfo } from "~/app/map/types/url-info";
import type { TileScale } from "~/app/map/Canvas/Tile/Base/BaseTileLayout";
import { useItemState } from "~/app/map/Canvas/Tile/Item/_internals/hooks";
import { ItemTileContent } from "~/app/map/Canvas/Tile/Item/_components/item-tile-content";
import { useEffect } from "react";
import { loggers } from "~/lib/debug/debug-logger";
import type { UseDOMBasedDragReturn } from "~/app/map/Services";

export interface DynamicItemTileProps {
  item: TileData;
  scale?: TileScale;
  baseHexSize?: number;
  allExpandedItemIds: string[];
  hasChildren: boolean;
  isCenter?: boolean;
  urlInfo: URLInfo;
  interactive?: boolean;
  currentUserId?: number;
  isSelected?: boolean;
  onNavigate?: (coordId: string) => void;
  onToggleExpansion?: (itemId: string, coordId: string) => void;
  domBasedDragService?: UseDOMBasedDragReturn;
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
    domBasedDragService: props.domBasedDragService
  });
  
  // Log tile render
  useEffect(() => {
    loggers.render.canvas('DynamicItemTile render', {
      coordId: item.metadata.coordId,
      dbId: item.metadata.dbId,
      name: item.data.name,
      scale,
      isCenter,
      hasChildren,
      isExpanded: allExpandedItemIds.includes(item.metadata.dbId),
      isSelected: props.isSelected,
      interactive,
      canEdit: state.canEdit,
      isBeingDragged: state.interaction.isBeingDragged,
    });
  });

  return (
    <>
      <div
        ref={state.tileRef} // DOM-based drag registration
        className={`group relative hover:z-10 select-none ${state.isBeingDragged ? 'dragging' : ''}`}
        data-testid={state.testId}
        style={{ opacity: state.isBeingDragged ? 0.5 : 1 }}
        // DOM-based drag props (only applies to draggable tiles)
        {...(state.dragProps.draggable && state.dragProps)}
      >
        <ItemTileContent
          {...props}
          scale={scale}
          baseHexSize={baseHexSize}
          isCenter={isCenter}
          interactive={interactive}
          tileColor={state.tileColor}
          testId={state.testId}
          isBeingDragged={state.isBeingDragged}
          canEdit={state.canEdit}
          isSelected={props.isSelected}
        />
      </div>
    </>
  );
};