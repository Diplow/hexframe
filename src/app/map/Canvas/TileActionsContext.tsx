"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { TileData } from "~/app/map/types/tile-data";
import { useTileClickHandlers, simulateDragStart } from "~/app/map/Canvas/Interactions";
import { ContextMenuContainer } from "~/app/map/Canvas/_components/ContextMenuContainer";
import { CopyFeedback, useCopyFeedback } from "~/components/ui/copy-feedback";
import type { Visibility } from '~/lib/domains/mapping/utils';

export interface TileActionsContextValue {
  // Click handlers
  onTileClick: (tileData: TileData, event: React.MouseEvent) => void;
  onTileDoubleClick: (tileData: TileData) => void;
  onTileRightClick: (tileData: TileData, event: React.MouseEvent) => void;
  onTileHover: (tileData: TileData) => void;

  // Action handlers
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

  // Drag and drop
  onTileDragStart: (tileData: TileData) => void;
  onTileDrop: (tileData: TileData) => void;
  isDragging: boolean;

  // Favorites - check if a tile is favorited by coordId
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
  // Optional handlers
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
  // Composition state - for context menu
  hasComposition?: (coordId: string) => boolean;
  isCompositionExpanded?: (coordId: string) => boolean;
  canShowComposition?: (tileData: TileData) => boolean;
  // Favorites - for context menu
  onAddFavorite?: (tileData: TileData) => void;
  onRemoveFavorite?: (tileData: TileData) => void;
  isFavorited?: (coordId: string) => boolean;
  /** Callback when user wants to edit a favorite's shortcut (opens favorites panel) */
  onEditShortcut?: (tileData: TileData) => void;
}

interface ContextMenuState {
  tileData: TileData;
  position: { x: number; y: number };
  canEdit: boolean;
  isEmptyTile?: boolean;
}

export function TileActionsProvider({
  children,
  onSelectClick,
  onNavigateClick,
  onExpandClick,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  onDeleteChildrenClick,
  onDeleteComposedClick,
  onDeleteExecutionHistoryClick,
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
}: TileActionsProviderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const { show: showCopyFeedback, isError: isCopyError, triggerSuccess: triggerCopySuccess, triggerError: triggerCopyError } = useCopyFeedback();

  const { onTileClick, onTileDoubleClick } = useTileClickHandlers({
    onNavigateClick,
    onSelectClick,
    onExpandClick,
    onCompositionToggle,
  });

  const onTileRightClick = useCallback((tileData: TileData, event: React.MouseEvent) => {
    // Right-click shows context menu
    event.preventDefault();
    
    const canEdit = 'state' in tileData && tileData.state?.canEdit === true;
    const isEmptyTile = !tileData.metadata.dbId || tileData.metadata.dbId === "0";
    
    setContextMenu({
      tileData,
      position: { x: event.clientX, y: event.clientY },
      canEdit,
      isEmptyTile,
    });
  }, []);

  const onTileHover = useCallback((_tileData: TileData) => {
    // Tool-specific hover behavior can be added here
  }, []);

  const onTileDragStart = useCallback((_tileData: TileData) => {
    setIsDragging(true);
  }, []);

  const onTileDrop = useCallback((_tileData: TileData) => {
    setIsDragging(false);
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleCopyToClick = useCallback((tileData: TileData) => {
    // Start drag in copy mode (no ctrl)
    simulateDragStart(tileData.metadata.coordId, { ctrlKey: false });
    closeContextMenu();
  }, [closeContextMenu]);

  const handleMoveToClick = useCallback((tileData: TileData) => {
    // Start drag in move mode (with ctrl)
    simulateDragStart(tileData.metadata.coordId, { ctrlKey: true });
    closeContextMenu();
  }, [closeContextMenu]);

  const value = useMemo(() => ({
    onTileClick,
    onTileDoubleClick,
    onTileRightClick,
    onTileHover,
    onTileDragStart,
    onTileDrop,
    isDragging,
    // Include optional handlers
    onSelectClick,
    onNavigateClick,
    onExpandClick,
    onCreateClick,
    onEditClick,
    onDeleteClick,
    onDeleteChildrenClick,
    onDeleteComposedClick,
    onDeleteExecutionHistoryClick,
    onCompositionToggle,
    // Favorites
    isFavorited,
  }), [
    onTileClick,
    onTileDoubleClick,
    onTileRightClick,
    onTileHover,
    onTileDragStart,
    onTileDrop,
    isDragging,
    onSelectClick,
    onNavigateClick,
    onExpandClick,
    onCreateClick,
    onEditClick,
    onDeleteClick,
    onDeleteChildrenClick,
    onDeleteComposedClick,
    onDeleteExecutionHistoryClick,
    onCompositionToggle,
    isFavorited,
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
        onCopyCoordinatesSuccess={triggerCopySuccess}
        onCopyCoordinatesError={triggerCopyError}
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