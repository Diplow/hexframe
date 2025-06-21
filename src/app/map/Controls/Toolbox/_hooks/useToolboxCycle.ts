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
  const [cyclePosition, setCyclePosition] = useState(DEFAULT_POSITION);

  const displayMode = getDisplayModeFromCycle(cyclePosition);

  // Load from localStorage after hydration
  useEffect(() => {
    try {
      const savedPosition = localStorage.getItem(STORAGE_KEY);
      if (savedPosition) {
        const position = parseInt(savedPosition, 10);
        if (!isNaN(position) && position >= 0 && position <= 3) {
          setCyclePosition(position);
        }
      }
    } catch (error) {
      console.warn('Failed to load toolbox cycle position from localStorage:', error);
    }
  }, []);

  // Save to localStorage when position changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, cyclePosition.toString());
    } catch (error) {
      console.warn('Failed to save toolbox cycle position to localStorage:', error);
    }
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