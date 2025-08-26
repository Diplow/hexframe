"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { TileData } from "../types/tile-data";
import { TileContextMenu } from "./TileContextMenu";

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
}: TileActionsProviderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const onTileClick = useCallback((tileData: TileData, event: React.MouseEvent) => {
    
    // Clear any existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    // Set a timeout to handle single click
    clickTimeoutRef.current = setTimeout(() => {
      if (event.ctrlKey || event.metaKey) {
        // Ctrl/Cmd+click for navigation
        onNavigateClick?.(tileData);
      } else {
        // Regular click for selection/preview
        onSelectClick?.(tileData);
      }
      clickTimeoutRef.current = null;
    }, 200); // Wait 200ms to see if it's a double-click
  }, [onNavigateClick, onSelectClick]);

  const onTileDoubleClick = useCallback((tileData: TileData) => {
    // Clear the single click timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    
    // Double-click to expand - only if tile can expand
    if (tileData.state?.canExpand) {
      onExpandClick?.(tileData);
    }
  }, [onExpandClick]);

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
  ]);

  return (
    <TileActionsContext.Provider value={value}>
      {children}
      {contextMenu && (
        <TileContextMenu
          tileData={contextMenu.tileData}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onSelect={() => onSelectClick?.(contextMenu.tileData)}
          onExpand={() => onExpandClick?.(contextMenu.tileData)}
          onNavigate={() => onNavigateClick?.(contextMenu.tileData)}
          onEdit={() => onEditClick?.(contextMenu.tileData)}
          onDelete={() => onDeleteClick?.(contextMenu.tileData)}
          onCreate={() => onCreateClick?.(contextMenu.tileData)}
          canEdit={contextMenu.canEdit}
          isEmptyTile={contextMenu.isEmptyTile}
        />
      )}
    </TileActionsContext.Provider>
  );
}

export { TileActionsContext };