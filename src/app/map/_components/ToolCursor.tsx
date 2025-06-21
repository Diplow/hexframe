"use client";

import { useEffect } from "react";
import { useTileActions } from "../Canvas/TileActionsContext";

/**
 * Global cursor style manager based on active tool
 * Applies cursor styles to the map canvas based on the currently selected tool
 */
export function ToolCursor() {
  const { activeTool } = useTileActions();

  useEffect(() => {
    // Find the map canvas element
    const mapCanvas = document.querySelector('[data-canvas-id]');
    if (!mapCanvas) return;

    // Define cursor styles for each tool
    const cursorStyles: Record<string, string> = {
      select: 'cursor-default',
      navigate: 'cursor-pointer',
      expand: 'cursor-zoom-in',
      create: 'cursor-crosshair',
      edit: 'cursor-text',
      delete: 'cursor-not-allowed',
    };

    // Apply the cursor style
    const cursor = cursorStyles[activeTool] ?? 'cursor-default';
    (mapCanvas as HTMLElement).style.cursor = cursor;

    // Cleanup - reset cursor when component unmounts
    return () => {
      (mapCanvas as HTMLElement).style.cursor = '';
    };
  }, [activeTool]);

  return null;
}