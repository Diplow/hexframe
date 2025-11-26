import type { TileData } from "~/app/map/types/tile-data";
import { TileContextMenu } from "~/app/map/Canvas/TileContextMenu";
import { _handleCopyCoordinates } from "~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/_handlers";

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
  onDeleteExecutionHistoryClick?: (tileData: TileData) => void;
  onCopyClick?: (tileData: TileData) => void;
  onMoveClick?: (tileData: TileData) => void;
  onCopyCoordinatesSuccess?: () => void;
  onCopyCoordinatesError?: () => void;
  onCompositionToggle?: (tileData: TileData) => void;
  hasComposition?: (coordId: string) => boolean;
  isCompositionExpanded?: (coordId: string) => boolean;
  canShowComposition?: (tileData: TileData) => boolean;
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
  onDeleteExecutionHistoryClick,
  onCopyClick,
  onMoveClick,
  onCopyCoordinatesSuccess,
  onCopyCoordinatesError,
  onCompositionToggle,
  hasComposition,
  isCompositionExpanded,
  canShowComposition,
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
      onDeleteExecutionHistory={() => onDeleteExecutionHistoryClick?.(contextMenu.tileData)}
      onCreate={() => onCreateClick?.(contextMenu.tileData)}
      onCopy={() => onCopyClick?.(contextMenu.tileData)}
      onMove={() => onMoveClick?.(contextMenu.tileData)}
      onCopyCoordinates={() => {
        _handleCopyCoordinates(
          contextMenu.tileData.metadata.coordId,
          () => onCopyCoordinatesSuccess?.(),
          () => onCopyCoordinatesError?.()
        );
      }}
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
    />
  );
}
