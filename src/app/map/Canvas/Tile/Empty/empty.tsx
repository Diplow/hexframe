"use client";

import { useState, useEffect, useRef } from "react";
import type { TileScale } from "~/app/map/Canvas/Tile/Base";
import { useCanvasTheme, useTileInteraction } from "~/app/map/Canvas";
import type { URLInfo } from "~/app/map/types";
import { loggers } from "~/lib/debug/debug-logger";
import {
  setupTileState,
  handleTileCreation,
  setupDropConfiguration,
  createTileLayout,
  renderEmptyTile,
} from "~/app/map/Canvas/Tile/Empty/_internals/empty-tile-helpers";

export interface DynamicEmptyTileProps {
  coordId: string;
  scale?: TileScale;
  baseHexSize?: number;
  urlInfo: URLInfo;
  parentItem?: { id: string; name: string; ownerId?: string };
  interactive?: boolean;
  currentUserId?: string;
  onCreateRequested?: (payload: {
    coordId: string;
    parentName?: string;
    parentId?: string;
    parentCoordId?: string;
  }) => void;
}


export function DynamicEmptyTile(props: DynamicEmptyTileProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { isDarkMode } = useCanvasTheme();
  const tileRef = useRef<HTMLDivElement>(null);

  const tileState = setupTileState(props);
  const interactionHandlers = useTileInteraction({
    coordId: props.coordId,
    type: 'empty',
    canEdit: tileState.canEdit,
    onCreate: () => handleTileCreation(props),
  });

  useEffect(() => {
    loggers.render.canvas('DynamicEmptyTile render', {
      coordId: props.coordId,
      scale: props.scale ?? 1,
      hasParent: !!props.parentItem,
      parentId: props.parentItem?.id,
      interactive: props.interactive ?? true,
      canEdit: tileState.canEdit,
    });
  });

  // Drop state will be handled by CSS classes from global service
  const dropConfig = setupDropConfiguration(props, false, null);
  const tileLayout = createTileLayout(props, isDarkMode, interactionHandlers, dropConfig, isHovered, tileState);

  return renderEmptyTile(props, tileRef, isHovered, setIsHovered, tileLayout);
}
