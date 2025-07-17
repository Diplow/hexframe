"use client";

import type { TileData } from "~/app/map/types/tile-data";
import { DynamicBaseTileLayout } from "~/app/map/Tile/Base";
import type { TileScale, TileColor } from "~/app/map/Canvas/base/BaseTileLayout";
import { DynamicTileContent } from "../content";
import type { URLInfo } from "~/app/map/types/url-info";
import { useTileInteraction } from "~/app/map/Canvas/hooks/shared/useTileInteraction";
import { useRouter } from "next/navigation";
import { useMapCache } from "~/app/map/Cache/map-cache";
import { useCanvasTheme } from "~/app/map/Canvas";

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
  isSelected?: boolean;
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
  isBeingDragged: _isBeingDragged,
  urlInfo: _urlInfo,
  allExpandedItemIds,
  hasChildren,
  isCenter: _isCenter,
  canEdit,
  isSelected,
}: ItemTileContentProps) {
  const router = useRouter();
  const { navigateToItem, toggleItemExpansionWithURL } = useMapCache();
  const { isDarkMode } = useCanvasTheme();
  
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
  
  // Use tile interaction hook for contextual behavior
  const { handleClick, handleDoubleClick, handleRightClick, cursor } = useTileInteraction({
    coordId: item.metadata.coordId,
    type: 'item',
    tileData: tileDataWithExpanded,
    canEdit,
    onNavigate: () => {
      void navigateToItem(item.metadata.coordId, { pushToHistory: true }).catch((error) => {
        console.warn("Navigation failed, falling back to page navigation", error);
        router.push(`/map?center=${item.metadata.dbId}`);
      });
    },
    onExpand: () => {
      toggleItemExpansionWithURL(item.metadata.dbId);
    },
  });
  
  return (
    <>
      <div
        onClick={interactive ? (e) => void handleClick(e) : undefined}
        onDoubleClick={interactive ? (e) => void handleDoubleClick(e) : undefined}
        onContextMenu={interactive ? (e) => void handleRightClick(e) : undefined}
      >
        <DynamicBaseTileLayout
          coordId={item.metadata.coordId}
          scale={scale}
          color={tileColor}
          baseHexSize={baseHexSize}
          cursor={interactive ? cursor : 'cursor-pointer'}
          isFocusable={false}
          isExpanded={allExpandedItemIds.includes(item.metadata.dbId)}
          isDarkMode={isDarkMode}
        >
          <DynamicTileContent
            data={{
              title: item.data.name,
              description: item.data.description,
              url: item.data.url,
            }}
            scale={scale}
            tileId={testId.replace("tile-", "")}
            isHovered={false}
            depth={item.metadata.depth}
            isSelected={isSelected}
          />
        </DynamicBaseTileLayout>
      </div>
      {/* Buttons are disabled for now */}
    </>
  );
}