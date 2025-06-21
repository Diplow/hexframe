export interface ToolboxDimensions {
  toolButtonHeight: number;
  toolSpacing: number;
  padding: number;
  separatorHeight: number;
  toggleButtonHeight: number;
}

export const TOOLBOX_DIMENSIONS: ToolboxDimensions = {
  toolButtonHeight: 48,    // h-12 in pixels
  toolSpacing: 6,         // space-y-1.5 in pixels
  padding: 16,            // p-2 * 2 (top and bottom) in pixels
  separatorHeight: 1,     // h-px in pixels
  toggleButtonHeight: 40, // Approximate height with padding
};

export function calculateToolboxHeight(toolCount: number): number {
  const { toolButtonHeight, toolSpacing, padding, separatorHeight, toggleButtonHeight } = TOOLBOX_DIMENSIONS;
  
  return toggleButtonHeight + 
         separatorHeight + 
         padding + 
         (toolCount * toolButtonHeight) + 
         ((toolCount - 1) * toolSpacing);
}

export function calculateToolboxTopOffset(toolCount: number): string {
  const openHeight = calculateToolboxHeight(toolCount);
  return `calc(50% - ${openHeight / 2}px)`;
}