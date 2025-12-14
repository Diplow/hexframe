import type { TileData } from "~/app/map/types/tile-data";
import { Eye, Maximize2, Navigation, Layers } from "lucide-react";
import type { MenuItem } from "~/app/map/Canvas/Menu/items-builder";

/**
 * View-related menu item builders (Preview, Expand, Navigate, Composition)
 */

export function _buildPreviewItem(onSelect?: () => void): MenuItem[] {
  return onSelect
    ? [
        {
          icon: Eye,
          label: "Preview",
          shortcut: "Click",
          onClick: onSelect,
        },
      ]
    : [];
}

export function _buildExpandItem(
  tileData: TileData,
  onExpand?: () => void,
): MenuItem[] {
  return onExpand
    ? [
        {
          icon: Maximize2,
          label: tileData.state?.isExpanded ? "Collapse" : "Expand",
          shortcut: "Shift+Click",
          onClick: onExpand,
        },
      ]
    : [];
}

export function _buildNavigateItem(onNavigate?: () => void): MenuItem[] {
  return onNavigate
    ? [
        {
          icon: Navigation,
          label: "Navigate",
          shortcut: "Ctrl+Click",
          onClick: onNavigate,
        },
      ]
    : [];
}

export function _buildCompositionItem(
  tileData: TileData,
  isCompositionExpanded: boolean,
  canShowComposition: boolean,
  onCompositionToggle?: (tileData: TileData) => void,
): MenuItem[] {
  return onCompositionToggle && canShowComposition
    ? [
        {
          icon: Layers,
          label: isCompositionExpanded
            ? "Hide Composition"
            : "Show Composition",
          shortcut: "Ctrl+Shift+Click",
          onClick: () => onCompositionToggle(tileData),
        },
      ]
    : [];
}
