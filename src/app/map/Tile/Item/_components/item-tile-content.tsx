"use client";

import { useState } from "react";
import type { TileData } from "~/app/map/types/tile-data";
import { DynamicBaseTileLayout } from "~/app/map/Tile/Base";
import type { TileScale, TileColor } from "~/app/static/map/Tile/Base/base";
import { DynamicTileContent } from "../content";
import { DynamicTileButtons } from "../item.buttons";
import type { URLInfo } from "~/app/map/types/url-info";
import { useTileInteraction } from "~/app/map/hooks/useTileInteraction";
import { useRouter } from "next/navigation";
import { useMapCache } from "~/app/map/Cache/map-cache";

interface ItemTileContentProps {
  item: TileData;
  scale: TileScale;
  baseHexSize: number;
  tileColor: TileColor | string; // Allow both old format and new semantic format
  testId: string;
  interactive: boolean;
  isBeingDragged: boolean;
  urlInfo: URLInfo;
  allExpandedItemIds: string[];
  hasChildren: boolean;
  isCenter: boolean;
  canEdit: boolean;
  onEditClick: () => void;
  onDeleteClick: () => void;
}

/**
 * Renders the content of an item tile including the base layout and buttons
 * Separates the visual presentation from the interaction logic
 */
export function ItemTileContent({
  item,
  scale,
  baseHexSize,
  tileColor,
  testId,
  interactive,
  isBeingDragged,
  urlInfo,
  allExpandedItemIds,
  hasChildren,
  isCenter,
  canEdit,
  onEditClick,
  onDeleteClick,
}: ItemTileContentProps) {
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();
  const { navigateToItem, toggleItemExpansionWithURL } = useMapCache();
  
  // Check if this tile is expanded
  const isExpanded = allExpandedItemIds.includes(item.metadata.dbId);
  
  // Create tile data with expanded state and permissions
  const tileDataWithExpanded = {
    ...item,
    state: {
      ...item.state,
      isExpanded,
      // Can expand if: scale > 1 AND (owns tile OR has children)
      // Can collapse if: already expanded (regardless of scale)
      canExpand: isExpanded || (scale > 1 && (canEdit || hasChildren)),
      canEdit  // Add canEdit state for drag/edit/delete operations
    }
  };
  
  // Use tile interaction hook for tool-based behavior
  const { handleClick, cursor, activeTool } = useTileInteraction({
    coordId: item.metadata.coordId,
    type: 'item',
    tileData: tileDataWithExpanded,
    onNavigate: () => {
      void navigateToItem(item.metadata.coordId, { pushToHistory: true }).catch((error) => {
        console.warn("Navigation failed, falling back to page navigation", error);
        router.push(`/map?center=${item.metadata.dbId}`);
      });
    },
    onExpand: () => {
      toggleItemExpansionWithURL(item.metadata.dbId);
    },
    onEdit: onEditClick,
    onDelete: onDeleteClick,
  });
  
  return (
    <>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={interactive ? (e) => void handleClick(e) : undefined}
      >
        <DynamicBaseTileLayout
          coordId={item.metadata.coordId}
          scale={scale}
          color={tileColor}
          baseHexSize={baseHexSize}
          cursor={interactive ? cursor : 'cursor-pointer'}
          isFocusable={false}
          isExpanded={allExpandedItemIds.includes(item.metadata.dbId)}
        >
          <DynamicTileContent
            data={{
              title: item.data.name,
              description: item.data.description,
              url: item.data.url,
            }}
            scale={scale}
            tileId={testId.replace("tile-", "")}
            isHovered={isHovered}
            depth={item.metadata.depth}
          />
        </DynamicBaseTileLayout>
      </div>
      {interactive && !isBeingDragged && activeTool === 'select' && (
        <DynamicTileButtons
          item={item}
          urlInfo={urlInfo}
          displayConfig={{ scale, isCenter }}
          expansionState={{ allExpandedItemIds, hasChildren }}
          canEdit={canEdit}
          onEditClick={onEditClick}
          onDeleteClick={onDeleteClick}
        />
      )}
    </>
  );
}