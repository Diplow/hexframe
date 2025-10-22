import type { TileData } from "~/app/map/types/tile-data";
import {
  Eye,
  Maximize2,
  Navigation,
  Edit,
  Trash2,
  Move,
  Plus,
  Layers,
  type LucideIcon,
} from "lucide-react";

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  shortcut: string;
  onClick: () => void;
  separator?: boolean;
  className?: string;
}

interface MenuItemsConfig {
  tileData: TileData;
  canEdit: boolean;
  isEmptyTile: boolean;
  isCompositionExpanded: boolean;
  canShowComposition: boolean;
  onSelect?: () => void;
  onExpand?: () => void;
  onNavigate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCreate?: () => void;
  onCompositionToggle?: (tileData: TileData) => void;
  onClose: () => void;
}

export function buildMenuItems(config: MenuItemsConfig): MenuItem[] {
  const {
    tileData,
    canEdit,
    isEmptyTile,
    isCompositionExpanded,
    canShowComposition,
    onSelect,
    onExpand,
    onNavigate,
    onEdit,
    onDelete,
    onCreate,
    onCompositionToggle,
    onClose,
  } = config;

  if (isEmptyTile) {
    return onCreate && canEdit
      ? [
          {
            icon: Plus,
            label: "Create Tile",
            shortcut: "Hover",
            onClick: onCreate,
          },
        ]
      : [];
  }

  return [
    ...(onSelect
      ? [
          {
            icon: Eye,
            label: "Preview",
            shortcut: "Click",
            onClick: onSelect,
          },
        ]
      : []),
    ...(onExpand
      ? [
          {
            icon: Maximize2,
            label: tileData.state?.isExpanded ? "Collapse" : "Expand",
            shortcut: "Shift+Click",
            onClick: onExpand,
          },
        ]
      : []),
    ...(onCompositionToggle && canShowComposition
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
      : []),
    ...(onNavigate
      ? [
          {
            icon: Navigation,
            label: "Navigate",
            shortcut: "Ctrl+Click",
            onClick: onNavigate,
          },
        ]
      : []),
    ...(canEdit && onEdit
      ? [
          {
            icon: Edit,
            label: "Edit",
            shortcut: "",
            onClick: onEdit,
            separator: true,
          },
        ]
      : []),
    ...(canEdit
      ? [
          {
            icon: Move,
            label: "Move",
            shortcut: "Drag",
            onClick: onClose,
          },
        ]
      : []),
    ...(canEdit && onDelete
      ? [
          {
            icon: Trash2,
            label: "Delete",
            shortcut: "",
            onClick: onDelete,
            className:
              "text-[color:var(--destructive-color-600)] dark:text-[color:var(--destructive-color-400)]",
          },
        ]
      : []),
  ];
}
