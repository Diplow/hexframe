import type { TileData } from "~/app/map/types/tile-data";
import type { ContextMenuItemData } from "~/components/ui/context-menu";
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
  _buildDeleteSubmenu,
  _buildCreateItem,
  _buildCopyCoordinatesItem,
} from "~/app/map/Canvas/_internals/menu/_builders/edit-actions";

export type MenuItem = ContextMenuItemData;

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
  onDeleteChildren?: () => void;
  onDeleteComposed?: () => void;
  onDeleteExecutionHistory?: () => void;
  onCreate?: () => void;
  onCompositionToggle?: (tileData: TileData) => void;
  onViewHistory?: () => void;
  onCopy?: () => void;
  onMove?: () => void;
  onCopyCoordinates?: () => void;
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
    onDeleteChildren,
    onDeleteComposed,
    onDeleteExecutionHistory,
    onCreate,
    onCompositionToggle,
    onViewHistory,
    onCopy,
    onMove,
    onCopyCoordinates,
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
    ..._buildDeleteSubmenu(canEdit, {
      onDelete,
      onDeleteChildren,
      onDeleteComposed,
      onDeleteExecutionHistory,
    }),
    ..._buildCopyCoordinatesItem(onCopyCoordinates),
  ];
}
