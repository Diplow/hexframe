/**
 * Helper functions for Empty Tile component
 */

import type { RefObject, Dispatch, SetStateAction } from "react";
import type { DynamicEmptyTileProps } from "~/app/map/Canvas/Tile/Empty/empty";
import type { TileColor } from "~/app/map/Canvas/Tile/Base";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import { getColor } from "~/app/map/types";
import { getDefaultStroke } from "~/app/map/Canvas/Tile/utils/stroke";
import type { useTileInteraction } from "~/app/map/Canvas";
import { DynamicBaseTileLayout } from "~/app/map/Canvas/Tile/Base";

export function setupTileState(props: DynamicEmptyTileProps) {
  const defaultStroke = getDefaultStroke(props.scale ?? 1, false);
  const canEdit = props.parentItem?.ownerId && props.currentUserId
    ? props.currentUserId.toString() === props.parentItem.ownerId.toString()
    : false;

  return { defaultStroke, canEdit };
}

export function handleTileCreation(props: DynamicEmptyTileProps) {
  const childCoords = CoordSystem.parseId(props.coordId);
  const parentCoords = CoordSystem.getParentCoord(childCoords);
  const parentCoordId = parentCoords ? CoordSystem.createId(parentCoords) : undefined;

  props.onCreateRequested?.({
    coordId: props.coordId,
    parentName: props.parentItem?.name,
    parentId: props.parentItem?.id,
    parentCoordId,
  });
}

export function setupDropConfiguration(
  props: DynamicEmptyTileProps,
  isDropTarget: boolean,
  dropOperation: 'move' | 'swap' | null
) {
  const targetCoords = CoordSystem.parseId(props.coordId);
  const previewColor = getColor(targetCoords);

  return {
    isDropTarget,
    dropOperation,
    previewColor
  };
}

export function createTileLayout(
  props: DynamicEmptyTileProps,
  isDarkMode: boolean,
  interactionHandlers: ReturnType<typeof useTileInteraction>,
  dropConfig: { isDropTarget: boolean; dropOperation: string | null; previewColor: string },
  isHovered: boolean,
  tileState: { defaultStroke: ReturnType<typeof getDefaultStroke>; canEdit: boolean }
) {
  const { cursor, shouldShowHoverEffects } = interactionHandlers;

  const tileColor = (() => {
    if (dropConfig.isDropTarget && dropConfig.dropOperation === 'move') {
      const [colorName, tint] = dropConfig.previewColor.split("-");
      return {
        color: colorName as TileColor["color"],
        tint: tint as TileColor["tint"]
      };
    }
    return undefined;
  })();

  return {
    coordId: props.coordId,
    scale: props.scale ?? 1,
    cursor,
    color: tileColor,
    stroke: isHovered && shouldShowHoverEffects ? tileState.defaultStroke : { color: "transparent" as const, width: 0 },
    baseHexSize: props.baseHexSize,
    isFocusable: true,
    isDarkMode,
    interactionHandlers,
    shouldShowHoverEffects
  };
}

export function renderEmptyTile(
  props: DynamicEmptyTileProps,
  tileRef: RefObject<HTMLDivElement> | null,
  isHovered: boolean,
  setIsHovered: Dispatch<SetStateAction<boolean>>,
  tileLayout: ReturnType<typeof createTileLayout>
) {
  const { handleClick, handleRightClick } = tileLayout.interactionHandlers;

  return (
    <div
      ref={tileRef}
      className={`group relative hover:z-10`}
      data-testid={`empty-tile-${props.coordId}`}
      data-tile-id={props.coordId}
      data-tile-owner="" // Empty tiles have no owner
      data-tile-has-content="false" // Empty tiles have no content
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div>
        <DynamicBaseTileLayout
          coordId={tileLayout.coordId}
          scale={tileLayout.scale}
          cursor={tileLayout.cursor}
          color={tileLayout.color}
          stroke={tileLayout.stroke}
          baseHexSize={tileLayout.baseHexSize}
          isFocusable={tileLayout.isFocusable}
          isDarkMode={tileLayout.isDarkMode}
        >
          <div className="absolute inset-0">
            <div
              className="pointer-events-auto absolute inset-0 z-10"
              onClick={props.interactive ? (e) => void handleClick(e) : undefined}
              onContextMenu={props.interactive ? (e) => void handleRightClick(e) : undefined}
              style={{
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
              }}
            />

            <div
              className={`absolute inset-0 transition-colors duration-200 pointer-events-none ${
                isHovered && tileLayout.shouldShowHoverEffects ? 'bg-black/10' : ''
              }`}
              style={{
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
              }}
            />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Green + button removed - creation is now handled via the Create tool */}
            </div>
          </div>
        </DynamicBaseTileLayout>
      </div>
    </div>
  );
}
