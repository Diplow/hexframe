"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import type { TileData } from "../types/tile-data";

export type ToolType = 'select' | 'navigate' | 'create' | 'edit' | 'delete' | 'expand' | 'drag';

export interface TileActionsContextValue {
  // Tool state
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  
  // Tool availability
  disabledTools: Set<ToolType>;
  setDisabledTools: (tools: Set<ToolType>) => void;
  
  // Generic handlers that dispatch based on active tool
  onTileClick: (tileData: TileData) => void;
  onTileHover: (tileData: TileData) => void;
  
  // Tool-specific handlers (optional, for testing)
  onSelectClick?: (tileData: TileData) => void;
  onNavigateClick?: (tileData: TileData) => void;
  onExpandClick?: (tileData: TileData) => void;
  onCreateClick?: (tileData: TileData) => void;
  onEditClick?: (tileData: TileData) => void;
  onDeleteClick?: (tileData: TileData) => void;
  onDragClick?: (tileData: TileData) => void;
  
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
  // Optional handlers for testing
  onSelectClick?: (tileData: TileData) => void;
  onNavigateClick?: (tileData: TileData) => void;
  onExpandClick?: (tileData: TileData) => void;
  onCreateClick?: (tileData: TileData) => void;
  onEditClick?: (tileData: TileData) => void;
  onDeleteClick?: (tileData: TileData) => void;
  onDragClick?: (tileData: TileData) => void;
  // Additional provider props
  activeTool?: ToolType;
  setActiveTool?: (tool: ToolType) => void;
}

export function TileActionsProvider({
  children,
  onSelectClick,
  onNavigateClick,
  onExpandClick,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  onDragClick,
  activeTool: controlledActiveTool,
  setActiveTool: controlledSetActiveTool,
}: TileActionsProviderProps) {
  const [internalActiveTool, setInternalActiveTool] = useState<ToolType>('expand');
  const [isDragging, setIsDragging] = useState(false);
  const [disabledTools, setDisabledTools] = useState<Set<ToolType>>(new Set());

  // Use controlled values if provided, otherwise use internal state
  const activeTool = controlledActiveTool ?? internalActiveTool;
  const setActiveTool = controlledSetActiveTool ?? setInternalActiveTool;

  // Initialize from localStorage after hydration
  useEffect(() => {
    if (controlledActiveTool) return; // Skip if controlled
    
    try {
      const savedTool = localStorage.getItem('active-tool') as ToolType | null;
      if (savedTool && ['select', 'navigate', 'create', 'edit', 'delete', 'expand', 'drag'].includes(savedTool)) {
        setInternalActiveTool(savedTool);
      }
    } catch (error) {
      console.warn('Failed to load active tool from localStorage:', error);
    }
  }, [controlledActiveTool]);

  const handleSetActiveTool = useCallback((tool: ToolType) => {
    setActiveTool(tool);
    // Save to localStorage with error handling
    try {
      localStorage.setItem('active-tool', tool);
    } catch (error) {
      console.warn('Failed to save active tool to localStorage:', error);
    }
  }, [setActiveTool]);

  const onTileClick = useCallback((tileData: TileData) => {
    switch (activeTool) {
      case 'select':
        onSelectClick?.(tileData);
        break;
      case 'navigate':
        onNavigateClick?.(tileData);
        break;
      case 'expand':
        onExpandClick?.(tileData);
        break;
      case 'create':
        onCreateClick?.(tileData);
        break;
      case 'edit':
        onEditClick?.(tileData);
        break;
      case 'delete':
        onDeleteClick?.(tileData);
        break;
      case 'drag':
        onDragClick?.(tileData);
        break;
    }
  }, [activeTool, onNavigateClick, onExpandClick, onCreateClick, onEditClick, onDeleteClick, onSelectClick, onDragClick]);

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
    activeTool,
    setActiveTool: handleSetActiveTool,
    disabledTools,
    setDisabledTools,
    onTileClick,
    onTileHover,
    onTileDragStart,
    onTileDrop,
    isDragging,
    // Include optional handlers for testing
    onSelectClick,
    onNavigateClick,
    onExpandClick,
    onCreateClick,
    onEditClick,
    onDeleteClick,
    onDragClick,
  }), [
    activeTool,
    handleSetActiveTool,
    disabledTools,
    onTileClick,
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
    onDragClick,
  ]);

  return (
    <TileActionsContext.Provider value={value}>
      {children}
    </TileActionsContext.Provider>
  );
}

export { TileActionsContext };