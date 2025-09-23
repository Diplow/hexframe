'use client';

// import { useEffect } from 'react';
import { useTileRegistration, type UseDOMBasedDragReturn } from '~/app/map/Services';
import { TilePreview } from '~/app/map/Chat/Timeline/Widgets/_shared/TilePreview';
import type { TileCursor } from '~/app/map/Canvas';

interface DraggableTilePreviewProps {
  tileId: string;
  tileColor?: string;
  size?: number;
  className?: string;
  cursor?: TileCursor;
  dragService?: UseDOMBasedDragReturn;
}

export function DraggableTilePreview({
  tileId,
  tileColor,
  size = 10,
  className,
  cursor = "cursor-pointer",
  dragService
}: DraggableTilePreviewProps) {

  const tileRef = useTileRegistration(tileId, dragService ?? null);


  // Get drag props for this tile - only if dragService is available
  const dragProps = dragService ? dragService.createDragProps(tileId) : {
    draggable: false,
    onDragStart: () => { /* no-op when drag service unavailable */ },
    onDragEnd: () => { /* no-op when drag service unavailable */ }
  };

  // Get drag state for visual feedback
  const isBeingDragged = dragService ? dragService.isDraggingTile(tileId) : false;




  return (
    <div
      ref={tileRef}
      className={className}
      style={{
        opacity: isBeingDragged ? 0.5 : 1,
        transition: 'opacity 0.2s ease'
      }}
      {...dragProps}
    >
      <TilePreview
        tileColor={tileColor}
        size={size}
        cursor={dragProps.draggable ? cursor : "cursor-not-allowed"}
      />
    </div>
  );
}