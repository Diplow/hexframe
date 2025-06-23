import { ChevronRight } from 'lucide-react';
import { cn } from '~/lib/utils';
import { getChevronRotation, getChevronTransitionDuration } from '../_utils/toolbox-visibility';
import type { DisplayMode } from '../_utils/toolbox-visibility';

interface ToolboxToggleProps {
  displayMode: DisplayMode;
  cyclePosition: number;
  onToggle: () => void;
}

export function ToolboxToggle({ displayMode, cyclePosition, onToggle }: ToolboxToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full h-12 flex items-center bg-gray-100 dark:bg-gray-800",
        "hover:bg-gray-200 dark:hover:bg-gray-700",
        "focus:bg-gray-200 dark:focus:bg-gray-700",
        "rounded-t-lg rounded-b-none transition-colors duration-200 focus:outline-none"
      )}
      aria-label="Toggle toolbox"
      aria-expanded={displayMode !== 'closed'}
    >
      <div className={cn(
        "w-full h-full flex items-center transition-all duration-300 ease-in-out",
        displayMode === 'full' ? "justify-start gap-2 px-6" : "justify-center"
      )}>
        <ChevronRight 
          className="w-5 h-5 flex-shrink-0 transition-transform ease-in-out text-gray-700 dark:text-gray-300"
          style={{
            transform: `rotate(${getChevronRotation(cyclePosition)}deg)`,
            transitionDuration: `${getChevronTransitionDuration(cyclePosition)}ms`
          }}
        />
        
        <span className={cn(
          "text-sm font-medium transition-all duration-300",
          displayMode === 'full' ? "opacity-100 flex-1 w-auto" : "opacity-0 w-0",
          "text-gray-700 dark:text-gray-300"
        )}>
          Toolbox
        </span>
        
        <span className={cn(
          "text-xs font-medium px-1.5 py-0.5 rounded transition-all duration-300",
          "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400",
          displayMode === 'full' ? "opacity-100" : "opacity-0 w-0 px-0"
        )}>
          T
        </span>
      </div>
    </button>
  );
}