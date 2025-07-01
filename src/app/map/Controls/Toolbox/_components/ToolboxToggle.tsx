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
        "relative w-full h-12 flex items-center px-3.5",
        "bg-white hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-700",
        "rounded-t-lg transition-all duration-200 focus:outline-none shadow-sm"
      )}
      aria-label="Toggle toolbox"
      aria-expanded={displayMode !== 'closed'}
    >
      <div className={cn(
        "w-full h-full flex items-center transition-all duration-300 ease-in-out",
        displayMode === 'full' ? "justify-between gap-2 px-2" : "justify-center"
      )}>
        <div className="flex items-center gap-4">
          <div className="w-5 flex items-center justify-left">
            <div className="w-5 h-5 flex items-center justify-center">
              <ChevronRight 
                className="w-5 h-5 flex-shrink-0 transition-transform ease-in-out text-neutral-700 dark:text-neutral-300"
            style={{
              transform: `rotate(${getChevronRotation(cyclePosition)}deg)`,
              transitionDuration: `${getChevronTransitionDuration(cyclePosition)}ms`
            }}
              />
          </div>

          </div>
          
          <span className={cn(
            "text-sm font-medium transition-all duration-300",
            displayMode === 'full' ? "opacity-100 w-auto" : "hidden",
            "text-neutral-700 dark:text-neutral-300"
          )}>
            Toolbox
          </span>
        </div>
        
        <span className={cn(
          "text-xs font-medium px-1.5 py-0.5 rounded transition-all duration-300",
          "min-w-[1.5rem] text-center",
          "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400",
          displayMode === 'full' ? "opacity-100 ml-auto" : "hidden")}>
          T
        </span>
      </div>
    </button>
  );
}