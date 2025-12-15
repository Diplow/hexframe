import type { TileData } from "~/app/map/types/tile-data";
import { TileContextMenu } from "~/app/map/Canvas/TileContextMenu";
import { copyToClipboard } from "~/components/ui/copy-feedback";
import type { Visibility } from '~/lib/domains/mapping/utils';

interface ContextMenuState {
  tileData: TileData;
  position: { x: number; y: number };
  canEdit: boolean;
  isEmptyTile?: boolean;
}

interface ContextMenuContainerProps {
  contextMenu: ContextMenuState | null;
  onClose: () => void;
  onSelectClick?: (tileData: TileData) => void;
  onNavigateClick?: (tileData: TileData) => void;
  onExpandClick?: (tileData: TileData) => void;
  onCreateClick?: (tileData: TileData) => void;
  onEditClick?: (tileData: TileData) => void;
  onDeleteClick?: (tileData: TileData) => void;
  onDeleteChildrenClick?: (tileData: TileData) => void;
  onDeleteComposedClick?: (tileData: TileData) => void;
  onDeleteHexplanClick?: (tileData: TileData) => void;
  onCopyClick?: (tileData: TileData) => void;
  onMoveClick?: (tileData: TileData) => void;
  onCopyCoordinatesSuccess?: () => void;
  onCopyCoordinatesError?: () => void;
  onCompositionToggle?: (tileData: TileData) => void;
  onSetVisibility?: (tileData: TileData, visibility: Visibility) => void;
  onSetVisibilityWithDescendants?: (tileData: TileData, visibility: Visibility) => void;
  hasComposition?: (coordId: string) => boolean;
  isCompositionExpanded?: (coordId: string) => boolean;
  canShowComposition?: (tileData: TileData) => boolean;
  /** Callback when user adds a tile to favorites */
  onAddFavorite?: (tileData: TileData) => void;
  /** Callback when user removes a tile from favorites */
  onRemoveFavorite?: (tileData: TileData) => void;
  /** Check if a tile is favorited by its coordId */
  isFavorited?: (coordId: string) => boolean;
  /** Callback when user wants to edit the shortcut for a favorited tile */
  onEditShortcut?: (tileData: TileData) => void;
}

export function ContextMenuContainer({
  contextMenu,
  onClose,
  onSelectClick,
  onNavigateClick,
  onExpandClick,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  onDeleteChildrenClick,
  onDeleteComposedClick,
  onDeleteHexplanClick,
  onCopyClick,
  onMoveClick,
  onCopyCoordinatesSuccess,
  onCopyCoordinatesError,
  onCompositionToggle,
  onSetVisibility,
  onSetVisibilityWithDescendants,
  hasComposition,
  isCompositionExpanded,
  canShowComposition,
  onAddFavorite,
  onRemoveFavorite,
  isFavorited,
  onEditShortcut,
}: ContextMenuContainerProps) {
  if (!contextMenu) return null;

  return (
    <TileContextMenu
      tileData={contextMenu.tileData}
      position={contextMenu.position}
      onClose={onClose}
      onSelect={() => onSelectClick?.(contextMenu.tileData)}
      onExpand={() => onExpandClick?.(contextMenu.tileData)}
      onNavigate={() => onNavigateClick?.(contextMenu.tileData)}
      onEdit={() => onEditClick?.(contextMenu.tileData)}
      onDelete={() => onDeleteClick?.(contextMenu.tileData)}
      onDeleteChildren={() => onDeleteChildrenClick?.(contextMenu.tileData)}
      onDeleteComposed={() => onDeleteComposedClick?.(contextMenu.tileData)}
      onDeleteHexplan={() => onDeleteHexplanClick?.(contextMenu.tileData)}
      onCreate={() => onCreateClick?.(contextMenu.tileData)}
      onCopy={() => onCopyClick?.(contextMenu.tileData)}
      onMove={() => onMoveClick?.(contextMenu.tileData)}
      onCopyCoordinates={() => {
        copyToClipboard(
          contextMenu.tileData.metadata.coordId,
          () => onCopyCoordinatesSuccess?.(),
          () => onCopyCoordinatesError?.()
        );
      }}
      onSetVisibility={(visibility) => onSetVisibility?.(contextMenu.tileData, visibility)}
      onSetVisibilityWithDescendants={(visibility) => onSetVisibilityWithDescendants?.(contextMenu.tileData, visibility)}
      visibility={contextMenu.tileData.data.visibility}
      onCompositionToggle={onCompositionToggle}
      canEdit={contextMenu.canEdit}
      isEmptyTile={contextMenu.isEmptyTile}
      hasComposition={
        hasComposition?.(contextMenu.tileData.metadata.coordId) ?? false
      }
      isCompositionExpanded={
        isCompositionExpanded?.(contextMenu.tileData.metadata.coordId) ?? false
      }
      canShowComposition={canShowComposition?.(contextMenu.tileData) ?? false}
      isFavorited={isFavorited?.(contextMenu.tileData.metadata.coordId) ?? false}
      onAddFavorite={() => onAddFavorite?.(contextMenu.tileData)}
      onRemoveFavorite={() => onRemoveFavorite?.(contextMenu.tileData)}
      onEditShortcut={() => onEditShortcut?.(contextMenu.tileData)}
    />
  );
}
