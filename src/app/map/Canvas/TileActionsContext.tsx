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
import { useTileClickHandlers } from "~/app/map/Canvas/_internals/tile-click-handlers";
import { ContextMenuContainer } from "~/app/map/Canvas/_components/ContextMenuContainer";
import { simulateDragStart } from "~/app/map/Canvas/_internals/drag-simulator";
import { CopyFeedback, useCopyFeedback } from "~/components/ui/copy-feedback";

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
  // Composition state - for context menu
  hasComposition?: (coordId: string) => boolean;
  isCompositionExpanded?: (coordId: string) => boolean;
  canShowComposition?: (tileData: TileData) => boolean;
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
  hasComposition,
  isCompositionExpanded,
  canShowComposition,
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
        hasComposition={hasComposition}
        isCompositionExpanded={isCompositionExpanded}
        canShowComposition={canShowComposition}
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