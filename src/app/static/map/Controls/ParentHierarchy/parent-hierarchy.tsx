import { ChevronDown } from "lucide-react";
import type { TileData } from "~/app/map/types/tile-data";
import { HierarchyTile } from "~/app/static/map/Tile/Hierarchy/hierarchy-tile";
import { _getParentHierarchy, _shouldShowHierarchy } from "~/app/map/Controls/ParentHierarchy/hierarchy.utils";
import type { URLInfo } from "~/app/map/types/url-info";

interface ParentHierarchyProps {
  centerCoordId: string;
  items: Record<string, TileData>;
  urlInfo: URLInfo;
}

export const ParentHierarchy = ({
  centerCoordId,
  items,
  urlInfo,
}: ParentHierarchyProps) => {
  const hierarchy = _getParentHierarchy(centerCoordId, items);

  if (!_shouldShowHierarchy(hierarchy, centerCoordId)) {
    return null;
  }

  return (
    <div className="fixed right-4 top-1/2 z-30 -translate-y-1/2">
      <div className="flex flex-col items-center gap-2 rounded-lg bg-transparent px-3 py-4">
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
            {index < hierarchy.length - 1 && (
              <ChevronDown size={16} className="flex-shrink-0 text-neutral-400" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
