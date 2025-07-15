"use client";

import type { TileData } from "../../types/tile-data";
import type { TileScale } from "~/app/map/components/BaseTileLayout";
import type { URLInfo } from "../../types/url-info";
import { useItemState } from "./_hooks";
import { ItemDialogs } from "./_components/item-dialogs";
import { ItemTileContent } from "./_components/item-tile-content";
import { useEffect } from "react";
import { loggers } from "~/lib/debug/debug-logger";

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
    scale
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
        className={`group relative hover:z-10 ${state.interaction.isBeingDragged ? 'dragging' : ''}`} 
        data-testid={state.testId}
        {...state.dragProps}
        {...state.dropProps}>
        <ItemTileContent
          {...props}
          scale={scale}
          baseHexSize={baseHexSize}
          isCenter={isCenter}
          interactive={interactive}
          tileColor={state.tileColor}
          testId={state.testId}
          isBeingDragged={state.interaction.isBeingDragged}
          canEdit={state.canEdit}
          onEditClick={state.dialogs.openUpdateDialog}
          onDeleteClick={state.dialogs.openDeleteDialog}
          isSelected={props.isSelected}
        />
      </div>
      <ItemDialogs item={item} dialogState={state.dialogs} />
    </>
  );
};