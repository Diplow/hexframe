import { useCallback, useRef } from "react";
import type { TileData } from "~/app/map/types/tile-data";

interface ClickHandlerConfig {
  onNavigateClick?: (tileData: TileData) => void;
  onSelectClick?: (tileData: TileData) => void;
  onExpandClick?: (tileData: TileData) => void;
  onCompositionToggle?: (tileData: TileData) => void;
}

export function useTileClickHandlers(config: ClickHandlerConfig) {
  const { onNavigateClick, onSelectClick, onExpandClick, onCompositionToggle } =
    config;
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onTileClick = useCallback(
    (tileData: TileData, event: React.MouseEvent) => {
      // Handle ctrl+shift+click for composition toggle immediately
      if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
          clickTimeoutRef.current = null;
        }
        onCompositionToggle?.(tileData);
        return;
      }

      // Handle shift+click for expansion/collapse immediately
      if (event.shiftKey && tileData.state?.canExpand) {
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
          clickTimeoutRef.current = null;
        }
        onExpandClick?.(tileData);
        return;
      }

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
    },
    [onNavigateClick, onSelectClick, onExpandClick, onCompositionToggle]
  );

  const onTileDoubleClick = useCallback((_tileData: TileData) => {
    // Clear the single click timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    // Double-click no longer handles expansion - this is now handled by shift+click
    // Keep this handler for potential future use or backwards compatibility
  }, []);

  return { onTileClick, onTileDoubleClick };
}
