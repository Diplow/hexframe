"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Maximize2, Minimize2, Crosshair, Pencil, Trash2, ExternalLink } from "lucide-react";
import { useMapCache } from "../../Cache/map-cache";
import { testLogger } from "~/lib/test-logger";
import {
  getButtonPositioning,
  getButtonsSizing,
} from "./_utils/button-utils";
import type { TileData } from "../../types/tile-data";
import type { TileScale } from "~/app/map/components/BaseTileLayout";
import type { URLInfo } from "../../types/url-info";

export interface TileButtonsProps {
  item: TileData;
  displayConfig: {
    scale?: TileScale;
    isCenter?: boolean;
  };
  expansionState: {
    allExpandedItemIds: string[];
    hasChildren: boolean;
  };
  urlInfo: URLInfo;
}

interface DynamicTileButtonsProps extends TileButtonsProps {
  onEditClick?: () => void;
  onDeleteClick?: () => void;
  canEdit?: boolean;
}

export const DynamicTileButtons = ({
  item,
  displayConfig,
  expansionState,
  urlInfo: _urlInfo,
  onEditClick,
  onDeleteClick,
  canEdit = false,
}: DynamicTileButtonsProps) => {
  const { scale = 1, isCenter = false } = displayConfig;
  const { allExpandedItemIds, hasChildren } = expansionState;
  const router = useRouter();
  const { navigateToItem, toggleItemExpansionWithURL } = useMapCache();

  const [isNavigating, setIsNavigating] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // Log component render
  testLogger.component("DynamicTileButtons", {
    itemId: item.metadata.dbId,
    itemName: item.data.name,
    scale,
    isCenter,
    hasChildren,
  });

  const isExpanded = allExpandedItemIds.includes(item.metadata.dbId);
  const ariaLabelForExpandButton = isExpanded
    ? `Collapse ${item.data.name}`
    : `Expand ${item.data.name}`;

  const containerPositionClasses = getButtonPositioning(scale);

  // Button visibility logic:
  // - Expand/Collapse: Show for tiles with children OR tiles you own (to create children)
  // - For scale 1 (smallest tiles):
  //   - If not expanded: Show only navigate button
  //   - If expanded: Show only collapse button (hide navigate to reduce clutter)
  // - For scale > 1: Show both buttons as appropriate
  const shouldRenderExpandButton =
    (hasChildren || canEdit) &&
    (scale > 1 || // For scale > 1, show if has children or you can edit
      (scale === 1 && isExpanded)); // For scale 1, only show collapse button if expanded

  const shouldRenderNavigationButton =
    !isCenter &&
    (scale > 1 || // For scale > 1, always show if not center
      (scale === 1 && !isExpanded)); // For scale 1, only show if not expanded

  const { iconSize, buttonSizeClasses } = getButtonsSizing(scale);

  // Handle expansion/collapse with URL update and cache sync
  const handleExpansion = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling

    setIsToggling(true);

    testLogger.interaction(
      isExpanded ? "collapse" : "expand",
      `tile-${item.metadata.dbId}`,
      {
        itemName: item.data.name,
        wasExpanded: isExpanded,
      },
    );

    try {
      // Use the cache's toggle method with URL sync
      toggleItemExpansionWithURL(item.metadata.dbId);
    } catch (error) {
      console.warn("Expansion failed", error);
    } finally {
      setIsToggling(false);
    }
  };

  // Handle navigation with URL update and cache sync
  const handleNavigation = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling

    setIsNavigating(true);

    testLogger.interaction("navigate", `tile-${item.metadata.dbId}`, {
      itemName: item.data.name,
      coordId: item.metadata.coordId,
    });

    try {
      // Use dynamic navigation method for instant feedback
      // Navigation should push to history (user wants to go back)
      await navigateToItem(item.metadata.coordId, { pushToHistory: true });
      testLogger.info(`Navigation successful to ${item.metadata.coordId}`);
    } catch (error) {
      testLogger.error(
        `Dynamic navigation failed for ${item.metadata.dbId}`,
        error,
      );
      console.warn(
        "Dynamic navigation failed, falling back to page navigation",
        error,
      );
      // Fallback to router navigation
      const navigationUrl = `/map?center=${item.metadata.dbId}`;
      testLogger.info(`Navigating to ${navigationUrl}`);
      router.push(navigationUrl);
    } finally {
      setIsNavigating(false);
    }
  };

  // Handle edit button click
  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEditClick?.();
  };

  // Handle delete button click
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteClick?.();
  };

  return (
    <div
      className={`${containerPositionClasses} pointer-events-none flex items-center gap-1`}
    >
      {/* Edit Button - only show if user can edit and scale is large enough */}
      {canEdit && scale > 1 && onEditClick && (
        <button
          onClick={handleEdit}
          aria-label={`Edit ${item.data.name}`}
          className={`${buttonSizeClasses} pointer-events-auto flex items-center justify-center rounded-md bg-secondary text-white opacity-0 shadow-lg hover:bg-secondary-light focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-secondary group-hover:opacity-100`}
        >
          <Pencil size={iconSize} />
        </button>
      )}

      {/* Delete Button - only show if user can edit, scale is large enough, and it's not a root map item */}
      {canEdit && scale > 1 && onDeleteClick && item.metadata.coordinates.path.length > 0 && (
        <button
          onClick={handleDelete}
          aria-label={`Delete ${item.data.name}`}
          className={`${buttonSizeClasses} pointer-events-auto flex items-center justify-center rounded-md bg-destructive text-white opacity-0 shadow-lg hover:bg-destructive-light focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-destructive group-hover:opacity-100`}
        >
          <Trash2 size={iconSize} />
        </button>
      )}

      {/* URL Button - show for scale 2 tiles with URLs */}
      {scale === 2 && item.data.url && (
        <a
          href={item.data.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Open link for ${item.data.name}`}
          className={`${buttonSizeClasses} pointer-events-auto flex items-center justify-center rounded-md bg-blue-800 text-white opacity-0 shadow-lg hover:bg-blue-700 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 group-hover:opacity-100`}
        >
          <ExternalLink size={iconSize} />
        </a>
      )}

      {/* Expand/Collapse Button */}
      {shouldRenderExpandButton && (
        <button
          onClick={handleExpansion}
          disabled={isToggling}
          aria-label={ariaLabelForExpandButton}
          aria-pressed={isExpanded}
          data-testid={`${isExpanded ? "collapse" : "expand"}-button-${item.metadata.coordinates.userId}-${item.metadata.coordinates.groupId}${item.metadata.coordinates.path.length > 0 ? `-${item.metadata.coordinates.path.join("-")}` : ''}`}
          className={`${buttonSizeClasses} pointer-events-auto flex items-center justify-center rounded-md text-white opacity-0 shadow-lg focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-neutral-500 group-hover:opacity-100 ${
            isToggling
              ? "animate-pulse bg-neutral-600 hover:bg-neutral-600"
              : "bg-neutral-800 hover:bg-neutral-700"
          }`}
        >
          {isExpanded ? (
            <Minimize2 size={iconSize} />
          ) : (
            <Maximize2 size={iconSize} />
          )}
        </button>
      )}

      {/* Navigation Button */}
      {shouldRenderNavigationButton && (
        <button
          onClick={handleNavigation}
          disabled={isNavigating}
          aria-label={`Navigate to ${item.data.name}`}
          data-testid={`navigate-button-${item.metadata.coordinates.userId}-${item.metadata.coordinates.groupId}${item.metadata.coordinates.path.length > 0 ? `-${item.metadata.coordinates.path.join("-")}` : ''}`}
          className={`${buttonSizeClasses} pointer-events-auto flex items-center justify-center rounded-md text-white opacity-0 shadow-lg focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-neutral-500 group-hover:opacity-100 ${
            isNavigating
              ? "animate-pulse bg-link hover:bg-link"
              : "bg-neutral-800 hover:bg-neutral-700"
          }`}
        >
          <Crosshair size={iconSize} />
        </button>
      )}
    </div>
  );
};
