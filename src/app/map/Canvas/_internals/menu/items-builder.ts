import type { TileData } from "~/app/map/types/tile-data";
import type { ContextMenuItemData } from "~/components/ui/context-menu";
import type { Visibility } from '~/lib/domains/mapping/utils';
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
  _buildVisibilitySubmenu,
} from "~/app/map/Canvas/_internals/menu/_builders/edit-actions";

export type MenuItem = ContextMenuItemData;

interface MenuItemsConfig {
  tileData: TileData;
  canEdit: boolean;
  isEmptyTile: boolean;
  isCompositionExpanded: boolean;
  canShowComposition: boolean;
  visibility?: Visibility;
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
  onSetVisibility?: (visibility: Visibility) => void;
  onSetVisibilityWithDescendants?: (visibility: Visibility) => void;
}

export function buildMenuItems(config: MenuItemsConfig): MenuItem[] {
  const {
    tileData,
    canEdit,
    isEmptyTile,
    isCompositionExpanded,
    canShowComposition,
    visibility,
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
    onSetVisibility,
    onSetVisibilityWithDescendants,
  } = config;

  if (isEmptyTile) {
    return [
      ..._buildCreateItem(canEdit, onCreate),
      ..._buildCopyCoordinatesItem(onCopyCoordinates),
    ];
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
    ..._buildVisibilitySubmenu(canEdit, visibility, {
      onSetVisibility,
      onSetVisibilityWithDescendants,
    }),
    ..._buildDeleteSubmenu(canEdit, {
      onDelete,
      onDeleteChildren,
      onDeleteComposed,
      onDeleteExecutionHistory,
    }),
    ..._buildCopyCoordinatesItem(onCopyCoordinates),
  ];
}
