/**
 * Frame Component - Renders tiles that can expand to show their children.
 *
 * Scale System:
 * - Center tile: scale 3
 *   └─ When expanded: scale 3 shallow tile containing:
 *       ├─ Center content: scale 2
 *       └─ Children: scale 2
 *           └─ When expanded: scale 2 shallow tile containing:
 *               ├─ Center content: scale 1
 *               └─ Children: scale 1 (cannot expand further)
 *
 * The 95% scaling (scale-95) creates visual depth showing children are "inside" their parent.
 */

import { DynamicFrameCore } from "~/app/map/Canvas/DynamicFrameCore";
import type { DynamicFrameCoreProps } from "~/app/map/Canvas/DynamicFrameCore";
import { NeighborTiles } from "~/app/map/Canvas/NeighborTiles";

// Re-export the core props interface for backward compatibility
export type DynamicFrameProps = Omit<DynamicFrameCoreProps, 'renderNeighbors'>;

/**
 * DynamicFrame wrapper that provides NeighborTiles rendering to the core implementation.
 * This breaks the circular dependency by injecting NeighborTiles as a render prop.
 */
export const DynamicFrame = (props: DynamicFrameProps) => {
  return (
    <DynamicFrameCore
      {...props}
      renderNeighbors={(centerItem, neighborProps) => (
        <NeighborTiles
          centerItem={centerItem}
          mapItems={neighborProps.mapItems}
          baseHexSize={neighborProps.baseHexSize}
          scale={neighborProps.scale}
          urlInfo={neighborProps.urlInfo}
          expandedItemIds={neighborProps.expandedItemIds}
          compositionExpandedIds={neighborProps.compositionExpandedIds}
          isDarkMode={neighborProps.isDarkMode}
          interactive={neighborProps.interactive}
          currentUserId={neighborProps.currentUserId}
          selectedTileId={neighborProps.selectedTileId}
          onNavigate={neighborProps.onNavigate}
          onToggleExpansion={neighborProps.onToggleExpansion}
          onCreateRequested={neighborProps.onCreateRequested}
        />
      )}
    />
  );
};

