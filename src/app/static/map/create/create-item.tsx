import Link from "next/link";
import { ArrowLeft, MapPin, ChevronDown } from "lucide-react";
import { CreateItemFormFields } from "./form-fields";
import { StaticBaseTileLayout } from "../Tile/Base/base";
import { HierarchyTile } from "../Tile/Hierarchy/hierarchy-tile";
import {
  CoordSystem,
  type Coord,
} from "~/lib/domains/mapping/utils/hex-coordinates";
import type { MapItemAPIContract } from "~/server/api/types/contracts";
import type { TileData } from "~/app/map/types/tile-data";
import { getColor } from "~/app/map/types/tile-data";
// Remove TILE_COLORS import as it's not needed
import { api } from "~/commons/trpc/server";
import { _getParentHierarchy } from "~/app/map/Controls/ParentHierarchy/hierarchy.utils";
import {
  HIERARCHY_TILE_BASE_SIZE,
  HIERARCHY_TILE_SCALE,
} from "~/app/map/constants";

interface StaticCreateItemFormProps {
  targetCoords: Coord;
  parentItem: MapItemAPIContract | null;
  returnUrl: string;
  rootItemId: string;
}

export async function StaticCreateItemForm({
  targetCoords,
  parentItem,
  returnUrl,
  rootItemId,
}: StaticCreateItemFormProps) {
  const coordsDisplay = `${targetCoords.userId},${targetCoords.groupId}:${targetCoords.path.join(",")}`;
  const coordId = CoordSystem.createId(targetCoords);

  // Get color for the future tile based on its position
  const tileColor = getColor(targetCoords);

  // Get all items for hierarchy building
  let items: Record<string, TileData> = {};
  let hierarchy: TileData[] = [];

  try {
    // Get the root item to find its userId
    const rootItem = await api.map.getRootItemById({
      mapItemId: parseInt(rootItemId),
    });

    const rootCoords = CoordSystem.parseId(rootItem.coordinates);

    // Fetch all map items to build hierarchy
    const mapItemsData = await api.map.getItemsForRootItem({
      userId: rootCoords.userId,
      groupId: rootCoords.groupId,
    });

    // Convert to TileData format
    items = mapItemsData.reduce(
      (acc: Record<string, TileData>, item) => {
        const coords = CoordSystem.parseId(item.coordinates);
        const parentId = CoordSystem.getParentCoordFromId(item.coordinates);

        acc[item.coordinates] = {
          data: {
            name: item.name,
            description: item.descr || "",
            url: item.url || "",
            color: getColor(coords),
          },
          metadata: {
            dbId: item.id,
            coordId: item.coordinates,
            coordinates: coords,
            parentId: parentId ?? undefined,
            depth: coords.path.length,
            ownerId: item.ownerId,
          },
          state: {
            isDragged: false,
            isHovered: false,
            isSelected: false,
            isExpanded: false,
            isDragOver: false,
            isHovering: false,
          },
        };
        return acc;
      },
      {} as Record<string, TileData>,
    );

    // Get parent hierarchy using the utility function
    hierarchy = _getParentHierarchy(coordId, items);
  } catch (error) {
    console.error("Failed to fetch hierarchy:", error);
  }

  // Build URLInfo for hierarchy tiles
  const urlInfo = {
    pathname: returnUrl.split("?")[0] ?? "",
    searchParamsString: returnUrl.split("?")[1] ?? "",
    rootItemId,
  };

  // Find where the "Creating child of" component should start

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={returnUrl}
          className="flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-neutral-300"
        >
          <ArrowLeft size={16} />
          Back to Map
        </Link>
      </div>

      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-white">Create New Item</h1>

        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <MapPin size={16} />
          <span>Position: {coordsDisplay}</span>
        </div>
      </div>

      {/* Main content area with two columns */}
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Left Column */}
        <div className="flex-1 space-y-6">
          {/* Parent Info */}
          {parentItem && (
            <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-4">
              <p className="text-sm font-medium text-neutral-300">
                Creating child of:{" "}
                <span className="font-normal text-white">
                  {parentItem.name}
                </span>
              </p>
            </div>
          )}

          {/* Form */}
          <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6">
            <CreateItemFormFields
              targetCoords={targetCoords}
              parentId={parentItem?.id}
              returnUrl={returnUrl}
              rootItemId={rootItemId}
            />
          </div>
        </div>

        {/* Right Column - Hierarchy Panel */}
        <div className="lg:w-96">
          {/* Hierarchy */}
          {(hierarchy.length > 0 || parentItem) && (
            <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">Hierarchy</h2>
              <div className="flex flex-col items-center gap-2">
              {hierarchy.map((item, index) => (
                <div
                  key={`hierarchy-${item.metadata.coordId}`}
                  className="flex flex-col items-center gap-1"
                >
                  <HierarchyTile
                    item={item}
                    hierarchy={hierarchy}
                    itemIndex={index}
                    urlInfo={urlInfo}
                  />
                  {(index < hierarchy.length - 1 || parentItem) && (
                    <ChevronDown
                      size={16}
                      className="flex-shrink-0 text-neutral-400"
                    />
                  )}
                </div>
              ))}

              {/* Show the direct parent if not already in hierarchy */}
              {parentItem &&
                !hierarchy.some(
                  (item) => item.metadata.dbId === parentItem.id,
                ) &&
                (() => {
                  const parentCoords = CoordSystem.getParentCoord(targetCoords);
                  if (!parentCoords) return null;

                  return (
                    <div className="flex flex-col items-center gap-1">
                      <HierarchyTile
                        item={{
                          data: {
                            name: parentItem.name,
                            description: parentItem.descr || "",
                            url: parentItem.url || "",
                            color: getColor(parentCoords),
                          },
                          metadata: {
                            dbId: parentItem.id,
                            coordId: CoordSystem.createId(parentCoords),
                            coordinates: parentCoords,
                            parentId: undefined,
                            depth: parentCoords.path.length,
                            ownerId: parentItem.ownerId,
                          },
                          state: {
                            isDragged: false,
                            isHovered: false,
                            isSelected: false,
                            isExpanded: false,
                            isDragOver: false,
                            isHovering: false,
                          },
                        }}
                        hierarchy={hierarchy}
                        itemIndex={hierarchy.length}
                        urlInfo={urlInfo}
                      />
                      <ChevronDown
                        size={16}
                        className="flex-shrink-0 text-neutral-400"
                      />
                    </div>
                  );
                })()}

              {/* Show the new item being created */}
              <div className="pointer-events-none opacity-60">
                <div className="flex-shrink-0 rounded-lg">
                  <StaticBaseTileLayout
                    coordId={coordId}
                    scale={HIERARCHY_TILE_SCALE}
                    color={tileColor}
                    baseHexSize={HIERARCHY_TILE_BASE_SIZE}
                    isFocusable={false}
                  >
                    <div className="flex h-full w-full items-center justify-center p-2">
                      <span
                        className="text-center text-xs font-medium leading-tight text-neutral-800"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        New Item
                      </span>
                    </div>
                  </StaticBaseTileLayout>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
