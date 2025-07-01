import * as React from 'react';
import { cn } from '~/lib/utils';
import type { ToolType } from '../../../Canvas/TileActionsContext';
import { 
  getToolButtonStyles, 
  getToolIconStyles, 
  getToolLabelStyles,
  type ToolColor 
} from '../_utils/tool-styles';
import { getToolVisibility } from '../_utils/toolbox-visibility';
import { ToolTooltip } from './ToolTooltip';
import type { DisplayMode } from '../_utils/toolbox-visibility';

export interface ToolConfig {
  id: ToolType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut: string;
  color: ToolColor;
}

interface ToolButtonProps {
  tool: ToolConfig;
  index: number;
  totalTools: number;
  isActive: boolean;
  isDisabled: boolean;
  displayMode: DisplayMode;
  cyclePosition: number;
  onClick: (toolId: ToolType) => void;
}

export function ToolButton({
  tool,
  index,
  totalTools,
  isActive,
  isDisabled,
  displayMode,
  cyclePosition,
  onClick
}: ToolButtonProps) {
  const Icon = tool.icon;
  const visibility = getToolVisibility(index, totalTools, displayMode, cyclePosition, isActive);
  const [isHovering, setIsHovering] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  const handleClick = () => {
    onClick(tool.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(tool.id);
    }
  };

  return (
    <div 
      className={cn(
        "relative overflow-visible transition-all duration-300 ease-in-out",
        visibility.shouldHide ? "opacity-0 max-h-0 scale-95" : "opacity-100 max-h-10 scale-100",
      )}
    >
      <button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => !isDisabled && setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={isDisabled}
        className={getToolButtonStyles(tool.color, isActive, isDisabled, displayMode)}
        aria-label={`${tool.label} tool${isDisabled ? ' (disabled)' : ''}`}
        aria-pressed={isActive}
        aria-disabled={isDisabled}
      >
        <div className={cn(
          "w-full h-full flex items-center",
          displayMode === 'full' ? "justify-between gap-2 px-3.5" : "justify-center"
        )}>
          <div className="flex items-center justify-center gap-4">
            <div className="w-5 flex items-center justify-start">
              <Icon className={getToolIconStyles(tool.color, isActive, isDisabled, isHovering && displayMode !== 'closed')} />
            </div>
            <span className={getToolLabelStyles(tool.color, isActive, isDisabled, displayMode, isHovering && displayMode !== 'closed', isFocused)}>
              {tool.label}
            </span>
          </div>
          
          {tool.shortcut && (
            <span className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded transition-all duration-300",
              "min-w-[1.5rem] text-center", // Added consistent minimum width and center text
              isDisabled 
                ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-500" 
                : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400",
              displayMode === 'full' ? "opacity-100 ml-auto" : "hidden"
            )}>
              {tool.shortcut}
            </span>
          )}
        </div>
      </button>

      <ToolTooltip
        label={tool.label}
        shortcut={tool.shortcut}
        show={isHovering && displayMode === 'icons'}
      />
    </div>
  );
}