import { cn } from '~/lib/utils';
import type { ToolType } from '../../../Canvas/TileActionsContext';

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
  const baseStyles = cn(
    "w-full h-12 flex items-center justify-start rounded-lg transition-all duration-200 relative overflow-hidden",
    displayMode === 'full' ? 'gap-2 px-2' : 'px-2',
    !isDisabled && displayMode !== 'closed' && "hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-105",
    "focus:outline-none focus:ring-2"
  );

  if (isDisabled) {
    return cn(baseStyles, 'opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-600');
  }

  if (isActive) {
    const activeStyles = {
      'cyan': 'bg-cyan-100 dark:bg-cyan-900/20 ring-2 ring-cyan-500 text-cyan-700 dark:text-cyan-400 focus:ring-cyan-500',
      'indigo': 'bg-indigo-100 dark:bg-indigo-900/20 ring-2 ring-indigo-500 text-indigo-700 dark:text-indigo-400 focus:ring-indigo-500',
      'purple': 'bg-purple-100 dark:bg-purple-900/20 ring-2 ring-purple-500 text-purple-700 dark:text-purple-400 focus:ring-purple-500',
      'green': 'bg-green-100 dark:bg-green-900/20 ring-2 ring-green-500 text-green-700 dark:text-green-400 focus:ring-green-500',
      'amber': 'bg-amber-100 dark:bg-amber-900/20 ring-2 ring-amber-500 text-amber-700 dark:text-amber-400 focus:ring-amber-500',
      'rose': 'bg-rose-100 dark:bg-rose-900/20 ring-2 ring-rose-500 text-rose-700 dark:text-rose-400 focus:ring-rose-500',
    };
    return cn(baseStyles, activeStyles[toolColor]);
  }

  const inactiveStyles = {
    'cyan': 'text-gray-700 dark:text-gray-300 focus:ring-cyan-500',
    'indigo': 'text-gray-700 dark:text-gray-300 focus:ring-indigo-500',
    'purple': 'text-gray-700 dark:text-gray-300 focus:ring-purple-500',
    'green': 'text-gray-700 dark:text-gray-300 focus:ring-green-500',
    'amber': 'text-gray-700 dark:text-gray-300 focus:ring-amber-500',
    'rose': 'text-gray-700 dark:text-gray-300 focus:ring-rose-500',
  };
  return cn(baseStyles, inactiveStyles[toolColor]);
}

export function getToolIconStyles(
  toolColor: ToolColor,
  isActive: boolean,
  isDisabled: boolean
) {
  const baseStyles = "w-5 h-5 flex-shrink-0";

  if (isDisabled) {
    return cn(baseStyles, 'text-gray-400 dark:text-gray-600');
  }

  if (isActive) {
    const activeStyles = {
      'cyan': 'text-cyan-600 dark:text-cyan-400',
      'indigo': 'text-indigo-600 dark:text-indigo-400',
      'purple': 'text-purple-600 dark:text-purple-400',
      'green': 'text-green-600 dark:text-green-400',
      'amber': 'text-amber-600 dark:text-amber-400',
      'rose': 'text-rose-600 dark:text-rose-400',
    };
    return cn(baseStyles, activeStyles[toolColor]);
  }

  return baseStyles;
}

export function getToolLabelStyles(
  toolColor: ToolColor,
  isActive: boolean,
  isDisabled: boolean,
  displayMode: 'closed' | 'icons' | 'full'
) {
  const baseStyles = cn(
    "text-sm font-medium transition-all duration-300",
    displayMode === 'full' ? "opacity-100 flex-1 w-auto" : "opacity-0 w-0"
  );

  if (isDisabled) {
    return cn(baseStyles, 'text-gray-400 dark:text-gray-600');
  }

  if (isActive) {
    const activeStyles = {
      'cyan': 'text-cyan-700 dark:text-cyan-400',
      'indigo': 'text-indigo-700 dark:text-indigo-400',
      'purple': 'text-purple-700 dark:text-purple-400',
      'green': 'text-green-700 dark:text-green-400',
      'amber': 'text-amber-700 dark:text-amber-400',
      'rose': 'text-rose-700 dark:text-rose-400',
    };
    return cn(baseStyles, activeStyles[toolColor]);
  }

  return cn(baseStyles, 'text-gray-700 dark:text-gray-300');
}