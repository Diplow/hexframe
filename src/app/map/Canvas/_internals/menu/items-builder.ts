import type { TileData } from "~/app/map/types/tile-data";
import { type LucideIcon } from "lucide-react";
import {
  _buildPreviewItem,
  _buildExpandItem,
  _buildCompositionItem,
  _buildNavigateItem,
} from "~/app/map/Canvas/_internals/menu/_builders/view-actions";
import {
  _buildViewHistoryItem,
  _buildEditItem,
  _buildCopyItem,
  _buildMoveItem,
  _buildDeleteItem,
  _buildCreateItem,
} from "~/app/map/Canvas/_internals/menu/_builders/edit-actions";

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
    return _buildCreateItem(canEdit, onCreate);
  }

  return [
    ..._buildPreviewItem(onSelect),
    ..._buildExpandItem(tileData, onExpand),
    ..._buildCompositionItem(
      tileData,
      isCompositionExpanded,
      canShowComposition,
      onCompositionToggle,
    ),
    ..._buildNavigateItem(onNavigate),
    ..._buildViewHistoryItem(onViewHistory),
    ..._buildEditItem(canEdit, onEdit),
    ..._buildCopyItem(canEdit, onCopy),
    ..._buildMoveItem(canEdit, onMove),
    ..._buildDeleteItem(canEdit, onDelete),
  ];
}
