import { cn } from '~/lib/utils';
import type { ToolType } from '../../../Canvas/TileActionsContext';
import { TOOL_COLOR_DESIGN_SYSTEM as TOOL_COLOR_MAPPING } from './tool-color-design-system';

export type ToolColor = 'cyan' | 'indigo' | 'purple' | 'green' | 'amber' | 'rose';

export const TOOL_COLORS: Record<ToolType, ToolColor> = {
  select: 'indigo',
  navigate: 'cyan',
  expand: 'indigo',
  drag: 'purple',
  create: 'green',
  edit: 'amber',
  delete: 'rose',
};

export function getToolButtonStyles(
  toolColor: ToolColor,
  isActive: boolean,
  isDisabled: boolean,
  displayMode: 'closed' | 'icons' | 'full'
) {
  const colorMap = TOOL_COLOR_MAPPING[toolColor];
  
  const baseStyles = cn(
    "w-full h-10 flex items-center rounded-lg relative",
    "transition-all duration-200",
    displayMode === 'full' ? 'justify-start gap-2 px-2' : 'justify-center px-2',
    "focus:outline-none focus-visible:outline-none outline-none",
  );

  if (isDisabled) {
    return cn(baseStyles, 'opacity-50 cursor-not-allowed');
  }

  if (isActive) {
    return cn(
      baseStyles,
      colorMap.text
    );
  }

  // Non-active state
  return cn(
    baseStyles, 
    'text-neutral-700 dark:text-neutral-300'
  );
}

export function getToolIconStyles(
  toolColor: ToolColor,
  isActive: boolean,
  isDisabled: boolean,
  isHovering?: boolean
) {
  const baseStyles = "w-5 h-5 flex-shrink-0 transition-colors duration-200";

  if (isDisabled) {
    return cn(baseStyles, 'text-neutral-500 dark:text-neutral-500');
  }

  const colorMap = TOOL_COLOR_MAPPING[toolColor];
  
  if (isActive || isHovering) {
    return cn(baseStyles, colorMap.icon);
  }

  return cn(baseStyles, 'text-neutral-700 dark:text-neutral-300');
}

export function getToolLabelStyles(
  toolColor: ToolColor,
  isActive: boolean,
  isDisabled: boolean,
  displayMode: 'closed' | 'icons' | 'full',
  isHovering?: boolean,
  isFocused?: boolean
) {
  const baseStyles = cn(
    "text-sm font-medium transition-all duration-300",
    displayMode === 'full' ? "opacity-100 flex-1 w-auto" : "hidden"
  );

  if (isDisabled) {
    return cn(baseStyles, 'text-neutral-500 dark:text-neutral-500');
  }

  const colorMap = TOOL_COLOR_MAPPING[toolColor];
  
  if (isActive || isHovering) {
    return cn(
      baseStyles, 
      colorMap.text,
      // Underline on focus
      isFocused && "underline"
    );
  }

  return cn(
    baseStyles, 
    'text-neutral-700 dark:text-neutral-300',
    // Underline on focus
    isFocused && "underline"
  );
}