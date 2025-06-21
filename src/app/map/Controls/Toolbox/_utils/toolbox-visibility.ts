export type DisplayMode = 'closed' | 'icons' | 'full';

export interface VisibilityState {
  shouldHide: boolean;
  isLastVisible: boolean;
  showTooltip: boolean;
}

export function getToolVisibility(
  toolIndex: number,
  totalTools: number,
  displayMode: DisplayMode,
  cyclePosition: number,
  isActive: boolean
): VisibilityState {
  const isClosing = cyclePosition === 0 && displayMode === 'icons';
  const shouldHide = (displayMode === 'closed' || isClosing) && !isActive;
  const isLastVisible = displayMode === 'closed' || toolIndex === totalTools - 1;
  const showTooltip = displayMode === 'icons';

  return {
    shouldHide,
    isLastVisible,
    showTooltip
  };
}

export function getDisplayModeFromCycle(cyclePosition: number): DisplayMode {
  if (cyclePosition === 0) return 'closed';
  if (cyclePosition === 2) return 'full';
  return 'icons';
}

export function getChevronRotation(cyclePosition: number): number {
  switch (cyclePosition) {
    case 0: return 90;    // Down
    case 1: return 0;     // Right
    case 2: return 180;   // Left
    case 3: return 270;   // Up
    default: return 0;
  }
}

export function getChevronTransitionDuration(cyclePosition: number): number {
  // 180° rotation for: position 2->3 (180° to 270°) and position 3->0 (270° to 90°)
  return (cyclePosition === 3 || cyclePosition === 0) ? 300 : 150;
}