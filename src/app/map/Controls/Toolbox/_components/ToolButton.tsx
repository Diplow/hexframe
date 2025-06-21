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
        "relative group overflow-visible transition-all duration-300 ease-in-out",
        visibility.shouldHide ? "opacity-0 max-h-0 scale-95" : "opacity-100 max-h-[48px] scale-100",
        !visibility.shouldHide && !visibility.isLastVisible && "mb-1.5"
      )}
    >
      <button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        className={getToolButtonStyles(tool.color, isActive, isDisabled, displayMode)}
        aria-label={`${tool.label} tool${isDisabled ? ' (disabled)' : ''}`}
        aria-pressed={isActive}
        aria-disabled={isDisabled}
      >
        <div className={cn(
          "w-full h-full flex items-center transition-all duration-300 ease-in-out",
          displayMode === 'full' ? "justify-start gap-2 px-2" : "justify-center"
        )}>
          <Icon className={getToolIconStyles(tool.color, isActive, isDisabled)} />
          
          <span className={getToolLabelStyles(tool.color, isActive, isDisabled, displayMode)}>
            {tool.label}
          </span>
          
          <span className={cn(
            "text-xs font-medium px-1.5 py-0.5 rounded transition-all duration-300",
            "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
            displayMode === 'full' ? "opacity-100" : "opacity-0 w-0 px-0"
          )}>
            {tool.shortcut}
          </span>
        </div>
      </button>

      <ToolTooltip
        label={tool.label}
        shortcut={tool.shortcut}
        show={visibility.showTooltip}
      />
    </div>
  );
}