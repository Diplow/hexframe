import type { TileData, URLInfo } from "~/app/map/Canvas/types";

// Shared helper functions for tile buttons

export const getButtonPositioning = (_scale: number) => {
  // Default positioning for scale 1 and 4+
  return "absolute left-1/2 -translate-x-1/2 top-[10%] z-30";
};

export const getButtonsSizing = (scale: number) => {
  let buttonSizeClasses = "h-6 w-6";
  let iconSize = 12;

  if (scale >= 2) {
    buttonSizeClasses = "h-8 w-8";
    iconSize = 16;
  }

  if (scale === 3) {
    buttonSizeClasses = "h-12 w-12";
    iconSize = 24;
  }

  if (scale >= 4) {
    buttonSizeClasses = "h-20 w-20";
    iconSize = 40;
  }

  return { iconSize, buttonSizeClasses };
};

export const getExpandUrl = (
  item: TileData,
  urlInfo: URLInfo,
  allExpandedItemIds: string[],
): string => {
  const isExpanded = allExpandedItemIds.includes(item.metadata.dbId);
  const newParams = new URLSearchParams(urlInfo.searchParamsString);

  if (isExpanded) {
    _collapse(newParams, item, allExpandedItemIds);
  } else {
    _expand(newParams, item, allExpandedItemIds);
  }

  return `${urlInfo.pathname}?${newParams.toString()}`;
};

// Private helper functions

const _collapse = (
  newParams: URLSearchParams,
  item: TileData,
  allExpandedItemIds: string[],
) => {
  const filteredIds = allExpandedItemIds.filter(
    (id) => id !== item.metadata.dbId,
  );
  if (filteredIds.length > 0) {
    newParams.set("expandedItems", filteredIds.join(","));
  } else {
    newParams.delete("expandedItems");
  }
};

const _expand = (
  newParams: URLSearchParams,
  item: TileData,
  allExpandedItemIds: string[],
) => {
  const newExpandedIds = [...allExpandedItemIds, item.metadata.dbId];
  newParams.set("expandedItems", newExpandedIds.join(","));
};