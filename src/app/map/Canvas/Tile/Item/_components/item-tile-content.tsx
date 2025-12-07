"use client";

import type { DragEvent } from "react";
import type { TileData } from "~/app/map/types/tile-data";
import type { URLInfo } from "~/app/map/types/url-info";
import { DynamicBaseTileLayout } from "~/app/map/Canvas/Tile/Base";
import type { TileScale, TileColor } from "~/app/map/Canvas/Tile/Base";
import { DynamicTileContent } from "~/app/map/Canvas/Tile/Item/content";
import { useTileInteraction } from "~/app/map/Canvas";
// import { useRouter } from "next/navigation"; // Removed unused import
import { useCanvasTheme } from "~/app/map/Canvas";
import { TileTooltip } from "~/app/map/Canvas/_shared/TileTooltip";
import type { Visibility } from '~/lib/domains/mapping/utils';
import { VisibilityIndicator } from "~/app/map/Canvas/_shared/VisibilityIndicator";

// Types for drag props
interface DragProps {
  draggable: boolean;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
}

interface DataAttributes {
  'data-tile-id': string;
  'data-tile-owner': string;
  'data-tile-has-content': string;
}

interface ItemTileContentProps {
  item: TileData;
  scale: TileScale;
  baseHexSize: number;
  tileColor: TileColor | string; // Allow both old format and new semantic format
  testId: string;
  interactive: boolean;
  urlInfo: URLInfo;
  allExpandedItemIds: string[];
  hasChildren: boolean;
  isCenter: boolean;
  canEdit: boolean;
  isSelected?: boolean;
  hasOperationPending?: boolean;
  operationType?: 'create' | 'update' | 'delete' | 'move' | 'copy' | 'swap' | null;
  dragProps?: DragProps; // Drag props from useItemState
  dataAttributes?: DataAttributes; // Data attributes for drag service
  parentVisibility?: Visibility; // Parent's visibility for comparison
  onNavigate?: (coordId: string) => void;
  onToggleExpansion?: (itemId: string, coordId: string) => void;
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
  // Removed isBeingDragged - handled by CSS
  urlInfo: _urlInfo,
  allExpandedItemIds,
  hasChildren,
  isCenter,
  canEdit,
  isSelected,
  dragProps,
  dataAttributes,
  parentVisibility,
  onNavigate,
  onToggleExpansion,
}: ItemTileContentProps) {
  // const router = useRouter(); // Removed unused variable
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
  const { handleClick, handleRightClick, cursor } = useTileInteraction({
    coordId: item.metadata.coordId,
    type: 'item',
    tileData: tileDataWithExpanded,
    canEdit,
    onNavigate: () => {
      onNavigate?.(item.metadata.coordId);
    },
    onExpand: () => {
      onToggleExpansion?.(item.metadata.dbId, item.metadata.coordId);
    },
  });
  
  return (
    <>
      <TileTooltip
        preview={item.data.preview}
        title={item.data.title}
        disabled={!interactive}
      >
        {/* Hexagon interaction area with its own z-index hierarchy */}
        <div
          className="absolute inset-0 hexagon-draggable"
          style={{
            // Clip to hexagon shape for precise click detection
            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            // Give neighbors higher z-index than center for corner priority
            zIndex: isCenter ? 20 : 25,
            pointerEvents: interactive ? "auto" : "none"
          }}
          onClick={interactive ? (e) => void handleClick(e) : undefined}
          onContextMenu={interactive ? (e) => void handleRightClick(e) : undefined}
          // Apply drag props to hexagon area
          {...(dragProps ?? {})}
          // Apply data attributes for drag service detection
          {...(dataAttributes ?? {})}
        >
          {/* Visual content container */}
          <div className="relative" style={{ width: "100%", height: "100%" }}>
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
                  title: item.data.title,
                  content: item.data.content,
                  link: item.data.link,
                }}
                scale={scale}
                tileId={testId.replace("tile-", "")}
                isHovered={false}
                depth={item.metadata.depth}
                isSelected={isSelected}
              />
            </DynamicBaseTileLayout>
            {/* Visibility indicator - positioned outside clipped area for proper tooltip rendering */}
            {scale >= 1 && (isCenter || item.data.visibility !== parentVisibility) && (
              <VisibilityIndicator
                visibility={item.data.visibility}
                scale={scale}
              />
            )}
          </div>
        </div>
      </TileTooltip>
      {/* Buttons are disabled for now */}
    </>
  );
}