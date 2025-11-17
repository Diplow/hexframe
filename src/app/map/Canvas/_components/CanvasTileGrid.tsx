import type { ReactNode } from "react";
import { useRef, useEffect } from "react";
import { DynamicFrame } from "~/app/map/Canvas/frame";
import type { TileScale } from "~/app/map/Canvas/Tile";
import type { URLInfo } from "~/app/map/types/url-info";
import type { TileData } from "~/app/map/types/tile-data";
import { OperationOverlay } from "~/app/map/Canvas/OperationOverlay";
import { usePendingOperations } from "~/app/map/Operations";
import { globalTilePositionService } from "~/app/map/Services";

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
  const pendingOperations = usePendingOperations();
  const canvasRef = useRef<HTMLDivElement>(null);

  // Set canvas reference for position service
  useEffect(() => {
    globalTilePositionService.setCanvasElement(canvasRef.current);
    return () => globalTilePositionService.setCanvasElement(null);
  }, []);

  return (
    <div className="relative flex h-full w-full flex-col">
      <div
        ref={canvasRef}
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
      <OperationOverlay
        pendingOperations={pendingOperations}
        getTilePosition={globalTilePositionService.getTilePosition.bind(globalTilePositionService)}
        baseHexSize={baseHexSize}
        scale={scale}
        canvasRef={canvasRef}
      />
      {children}
    </div>
  );
}
