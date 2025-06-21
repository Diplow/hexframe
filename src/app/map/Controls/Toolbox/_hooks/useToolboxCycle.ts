import { useState, useEffect, useCallback } from 'react';
import { getDisplayModeFromCycle, type DisplayMode } from '../_utils/toolbox-visibility';

const STORAGE_KEY = 'toolbox-cycle-position';
const DEFAULT_POSITION = 2; // Default to full mode

export interface ToolboxCycleState {
  cyclePosition: number;
  displayMode: DisplayMode;
  toggleDisplayMode: () => void;
  openToIconsMode: () => void;
}

export function useToolboxCycle(): ToolboxCycleState {
  const [cyclePosition, setCyclePosition] = useState(() => {
    const savedPosition = localStorage.getItem(STORAGE_KEY);
    return savedPosition ? parseInt(savedPosition, 10) : DEFAULT_POSITION;
  });

  const displayMode = getDisplayModeFromCycle(cyclePosition);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, cyclePosition.toString());
  }, [cyclePosition]);

  const toggleDisplayMode = useCallback(() => {
    setCyclePosition((prev) => (prev + 1) % 4);
  }, []);

  const openToIconsMode = useCallback(() => {
    if (displayMode === 'closed') {
      setCyclePosition(1); // Set to icons mode
    }
  }, [displayMode]);

  return {
    cyclePosition,
    displayMode,
    toggleDisplayMode,
    openToIconsMode
  };
}