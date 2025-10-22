import type { ReactNode } from "react";
import { DynamicFrame } from "~/app/map/Canvas/frame";
import type { TileScale } from "~/app/map/Canvas/Tile";
import type { URLInfo } from "~/app/map/types/url-info";
import type { TileData } from "~/app/map/types/tile-data";

interface CanvasTileGridProps {
  centerInfo: string;
  items: Record<string, TileData>;
  baseHexSize: number;
  expandedItemIds: string[];
  isCompositionExpanded: boolean;
  scale: TileScale;
  urlInfo: URLInfo;
  interactive: boolean;
  currentUserId?: number;
  selectedTileId: string | null;
  showNeighbors: boolean;
  onNavigate: (coordId: string) => void;
  onToggleExpansion: (itemId: string, coordId: string) => void;
  onCreateRequested: (payload: {
    coordId: string;
    parentName?: string;
    parentId?: string;
    parentCoordId?: string;
  }) => void;
  children?: ReactNode;
}

export function CanvasTileGrid({
  centerInfo,
  items,
  baseHexSize,
  expandedItemIds,
  isCompositionExpanded,
  scale,
  urlInfo,
  interactive,
  currentUserId,
  selectedTileId,
  showNeighbors,
  onNavigate,
  onToggleExpansion,
  onCreateRequested,
  children,
}: CanvasTileGridProps) {
  return (
    <div className="relative flex h-full w-full flex-col">
      <div
        data-canvas-id={centerInfo}
        className="pointer-events-auto grid flex-grow py-4 overflow-visible"
        style={{
          placeItems: 'center',
          // Offset the center point to account for chat panel (40% of width)
          // This shifts the center tile to appear centered in the right 60% area
          transform: 'translateX(20%)'
        }}
      >
        <DynamicFrame
          center={centerInfo}
          mapItems={items}
          baseHexSize={baseHexSize}
          expandedItemIds={expandedItemIds}
          isCompositionExpanded={isCompositionExpanded}
          scale={scale}
          urlInfo={urlInfo}
          interactive={interactive}
          currentUserId={currentUserId}
          selectedTileId={selectedTileId}
          showNeighbors={showNeighbors}
          onNavigate={onNavigate}
          onToggleExpansion={onToggleExpansion}
          onCreateRequested={onCreateRequested}
        />
      </div>
      {children}
    </div>
  );
}
