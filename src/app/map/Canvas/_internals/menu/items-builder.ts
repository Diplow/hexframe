import type { TileData } from "~/app/map/types/tile-data";
import {
  Eye,
  Maximize2,
  Navigation,
  Edit,
  Trash2,
  Move,
  Copy,
  Plus,
  Layers,
  History,
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
  onViewHistory?: () => void;
  onCopy?: () => void;
  onMove?: () => void;
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
    onViewHistory,
    onCopy,
    onMove,
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
    ...(onViewHistory
      ? [
          {
            icon: History,
            label: "View History",
            shortcut: "",
            onClick: onViewHistory,
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
    ...(canEdit && onCopy
      ? [
          {
            icon: Copy,
            label: "Copy to...",
            shortcut: "Drag",
            onClick: onCopy,
            className: "text-link",
          },
        ]
      : []),
    ...(canEdit && onMove
      ? [
          {
            icon: Move,
            label: "Move to...",
            shortcut: "Ctrl+Drag",
            onClick: onMove,
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
