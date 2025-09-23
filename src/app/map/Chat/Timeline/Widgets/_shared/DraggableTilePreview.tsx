'use client';

import type { DragEvent } from 'react';
import { TilePreview } from '~/app/map/Chat/Timeline/Widgets/_shared/TilePreview';
import type { TileCursor } from '~/app/map/Canvas';
import { useMapCache } from '~/app/map/Cache';
import { canDragTile } from '~/app/map/Services';
import { useUnifiedAuth } from '~/contexts/UnifiedAuthContext';

interface DraggableTilePreviewProps {
  tileId: string;
  tileColor?: string;
  size?: number;
  className?: string;
  cursor?: TileCursor;
}

export function DraggableTilePreview({
  tileId,
  tileColor,
  size = 10,
  className,
  cursor = "cursor-pointer"
}: DraggableTilePreviewProps) {
  const { getItem, startDrag } = useMapCache();
  const { mappingUserId } = useUnifiedAuth();

  // Get the tile data to check if it can be dragged
  const tileData = getItem(tileId);
  const isDraggable = tileData ? canDragTile(tileData, mappingUserId) : false;

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (!isDraggable || !tileData) {
      event.preventDefault();
      return;
    }
    startDrag(tileId, event.nativeEvent);
  };

  return (
    <div
      className={className}
      data-tile-id={tileId}
      data-tile-has-content="true"
      draggable={isDraggable}
      onDragStart={handleDragStart}
    >
      <TilePreview
        tileColor={tileColor}
        size={size}
        cursor={isDraggable ? cursor : "cursor-not-allowed"}
      />
    </div>
  );
}