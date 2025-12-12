"use client";

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import type { TileData } from "~/app/map/types/tile-data";
import { useTileClickHandlers, simulateDragStart } from "~/app/map/Canvas/Interactions";
import { ContextMenuContainer } from "~/app/map/Canvas/_internals/ContextMenuContainer";
import { CopyFeedback, useCopyFeedback } from "~/components/ui/copy-feedback";
import type { Visibility } from '~/lib/domains/mapping/utils';

export interface TileActionsContextValue {
  onTileClick: (tileData: TileData, event: React.MouseEvent) => void;
  onTileDoubleClick: (tileData: TileData) => void;
  onTileRightClick: (tileData: TileData, event: React.MouseEvent) => void;
  onTileHover: (tileData: TileData) => void;
  onSelectClick?: (tileData: TileData) => void;
  onNavigateClick?: (tileData: TileData) => void;
  onExpandClick?: (tileData: TileData) => void;
  onCreateClick?: (tileData: TileData) => void;
  onEditClick?: (tileData: TileData) => void;
  onDeleteClick?: (tileData: TileData) => void;
  onDeleteChildrenClick?: (tileData: TileData) => void;
  onDeleteComposedClick?: (tileData: TileData) => void;
  onDeleteExecutionHistoryClick?: (tileData: TileData) => void;
  onCompositionToggle?: (tileData: TileData) => void;
  onTileDragStart: (tileData: TileData) => void;
  onTileDrop: (tileData: TileData) => void;
  isDragging: boolean;
  isFavorited?: (coordId: string) => boolean;
}

const TileActionsContext = createContext<TileActionsContextValue | null>(null);

export function useTileActions() {
  const context = useContext(TileActionsContext);
  if (!context) {
    throw new Error("useTileActions must be used within TileActionsProvider");
  }
  return context;
}

interface TileActionsProviderProps {
  children: ReactNode;
  onSelectClick?: (tileData: TileData) => void;
  onNavigateClick?: (tileData: TileData) => void;
  onExpandClick?: (tileData: TileData) => void;
  onCreateClick?: (tileData: TileData) => void;
  onEditClick?: (tileData: TileData) => void;
  onDeleteClick?: (tileData: TileData) => void;
  onDeleteChildrenClick?: (tileData: TileData) => void;
  onDeleteComposedClick?: (tileData: TileData) => void;
  onDeleteExecutionHistoryClick?: (tileData: TileData) => void;
  onCompositionToggle?: (tileData: TileData) => void;
  onSetVisibility?: (tileData: TileData, visibility: Visibility) => void;
  onSetVisibilityWithDescendants?: (tileData: TileData, visibility: Visibility) => void;
  hasComposition?: (coordId: string) => boolean;
  isCompositionExpanded?: (coordId: string) => boolean;
  canShowComposition?: (tileData: TileData) => boolean;
  onAddFavorite?: (tileData: TileData) => void;
  onRemoveFavorite?: (tileData: TileData) => void;
  isFavorited?: (coordId: string) => boolean;
  onEditShortcut?: (tileData: TileData) => void;
}

interface ContextMenuState {
  tileData: TileData;
  position: { x: number; y: number };
  canEdit: boolean;
  isEmptyTile?: boolean;
}

/** Creates a right-click handler that shows the context menu */
function _useRightClickHandler(setContextMenu: (state: ContextMenuState | null) => void) {
  return useCallback((tileData: TileData, event: React.MouseEvent) => {
    event.preventDefault();
    const canEdit = 'state' in tileData && tileData.state?.canEdit === true;
    const isEmptyTile = !tileData.metadata.dbId || tileData.metadata.dbId === "0";
    setContextMenu({ tileData, position: { x: event.clientX, y: event.clientY }, canEdit, isEmptyTile });
  }, [setContextMenu]);
}

/** Creates drag handlers for simulated drag operations */
function _useDragMenuHandlers(closeContextMenu: () => void) {
  const handleCopyToClick = useCallback((tileData: TileData) => {
    simulateDragStart(tileData.metadata.coordId, { ctrlKey: false });
    closeContextMenu();
  }, [closeContextMenu]);

  const handleMoveToClick = useCallback((tileData: TileData) => {
    simulateDragStart(tileData.metadata.coordId, { ctrlKey: true });
    closeContextMenu();
  }, [closeContextMenu]);

  return { handleCopyToClick, handleMoveToClick };
}

export function TileActionsProvider(props: TileActionsProviderProps) {
  const {
    children, onSelectClick, onNavigateClick, onExpandClick, onCreateClick, onEditClick,
    onDeleteClick, onDeleteChildrenClick, onDeleteComposedClick, onDeleteExecutionHistoryClick,
    onCompositionToggle, onSetVisibility, onSetVisibilityWithDescendants, hasComposition,
    isCompositionExpanded, canShowComposition, onAddFavorite, onRemoveFavorite, isFavorited, onEditShortcut,
  } = props;

  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const { show: showCopyFeedback, isError: isCopyError, triggerSuccess, triggerError } = useCopyFeedback();

  const { onTileClick, onTileDoubleClick } = useTileClickHandlers({
    onNavigateClick, onSelectClick, onExpandClick, onCompositionToggle,
  });
  const onTileRightClick = _useRightClickHandler(setContextMenu);
  const onTileHover = useCallback((_tileData: TileData) => {}, []);
  const onTileDragStart = useCallback(() => setIsDragging(true), []);
  const onTileDrop = useCallback(() => setIsDragging(false), []);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  const { handleCopyToClick, handleMoveToClick } = _useDragMenuHandlers(closeContextMenu);

  const value = useMemo(() => ({
    onTileClick, onTileDoubleClick, onTileRightClick, onTileHover, onTileDragStart, onTileDrop, isDragging,
    onSelectClick, onNavigateClick, onExpandClick, onCreateClick, onEditClick, onDeleteClick,
    onDeleteChildrenClick, onDeleteComposedClick, onDeleteExecutionHistoryClick, onCompositionToggle, isFavorited,
  }), [
    onTileClick, onTileDoubleClick, onTileRightClick, onTileHover, onTileDragStart, onTileDrop, isDragging,
    onSelectClick, onNavigateClick, onExpandClick, onCreateClick, onEditClick, onDeleteClick,
    onDeleteChildrenClick, onDeleteComposedClick, onDeleteExecutionHistoryClick, onCompositionToggle, isFavorited,
  ]);

  return (
    <TileActionsContext.Provider value={value}>
      {children}
      <ContextMenuContainer
        contextMenu={contextMenu}
        onClose={closeContextMenu}
        onSelectClick={onSelectClick}
        onNavigateClick={onNavigateClick}
        onExpandClick={onExpandClick}
        onCreateClick={onCreateClick}
        onEditClick={onEditClick}
        onDeleteClick={onDeleteClick}
        onDeleteChildrenClick={onDeleteChildrenClick}
        onDeleteComposedClick={onDeleteComposedClick}
        onDeleteExecutionHistoryClick={onDeleteExecutionHistoryClick}
        onCopyClick={handleCopyToClick}
        onMoveClick={handleMoveToClick}
        onCopyCoordinatesSuccess={triggerSuccess}
        onCopyCoordinatesError={triggerError}
        onCompositionToggle={onCompositionToggle}
        onSetVisibility={onSetVisibility}
        onSetVisibilityWithDescendants={onSetVisibilityWithDescendants}
        hasComposition={hasComposition}
        isCompositionExpanded={isCompositionExpanded}
        canShowComposition={canShowComposition}
        onAddFavorite={onAddFavorite}
        onRemoveFavorite={onRemoveFavorite}
        isFavorited={isFavorited}
        onEditShortcut={onEditShortcut}
      />
      {showCopyFeedback && (
        <CopyFeedback
          message={isCopyError ? "Failed to copy coordinates" : "Coordinates copied to clipboard!"}
          variant={isCopyError ? "error" : "success"}
        />
      )}
    </TileActionsContext.Provider>
  );
}

export { TileActionsContext };