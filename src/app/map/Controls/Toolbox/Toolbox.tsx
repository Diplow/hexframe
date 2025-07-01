"use client";

import * as React from 'react';
import { cn } from '~/lib/utils';
import { useTileActions } from '../../Canvas/TileActionsContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useToolboxCycle } from './_hooks/useToolboxCycle';
import { useToolboxKeyboard } from './_hooks/useToolboxKeyboard';
import { calculateToolboxTopOffset } from './_utils/toolbox-layout';
import { ToolboxToggle } from './_components/ToolboxToggle';
import { ToolButton, type ToolConfig } from './_components/ToolButton';
import { ToolTooltip } from './_components/ToolTooltip';
import { 
  Navigation, 
  Plus, 
  Edit, 
  Trash2, 
  Maximize2,
  Move,
  Sun,
  Moon,
  MousePointer,
} from 'lucide-react';
import { useTheme } from '~/contexts/ThemeContext';
import type { ToolType } from '../../Canvas/TileActionsContext';

const TOOLS: ToolConfig[] = [
  { id: 'select', label: 'Select', icon: MousePointer, shortcut: 'S', color: 'indigo' },
  { id: 'expand', label: 'Expand', icon: Maximize2, shortcut: 'X', color: 'indigo' },
  { id: 'navigate', label: 'Navigate', icon: Navigation, shortcut: 'N', color: 'cyan' },
  { id: 'create', label: 'Create', icon: Plus, shortcut: 'C', color: 'green' },
  { id: 'edit', label: 'Edit', icon: Edit, shortcut: 'E', color: 'amber' },
  { id: 'drag', label: 'Move', icon: Move, shortcut: 'M', color: 'purple' },
  { id: 'delete', label: 'Delete', icon: Trash2, shortcut: 'D', color: 'rose' },
];

export function Toolbox() {
  const { activeTool, setActiveTool, disabledTools } = useTileActions();
  const { cyclePosition, displayMode, toggleDisplayMode, openToIconsMode } = useToolboxCycle();
  const { theme, toggleTheme } = useTheme();
  
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();
  useToolboxKeyboard(toggleDisplayMode);

  const handleToolClick = (tool: ToolType) => {
    // Don't select disabled tools
    if (disabledTools.has(tool)) {
      return;
    }
    
    setActiveTool(tool);
    // If toolbox is closed, open it to icons mode when a tool is selected
    openToIconsMode();
  };

  const topOffset = calculateToolboxTopOffset(TOOLS.length);

  return (
    <div className="fixed left-4 z-50" style={{ top: topOffset }}>
      <div className={cn(
        "bg-center-depth-0 shadow-lg border rounded-lg",
        "border-[color:var(--stroke-color-950)]",
        "transition-all duration-300 ease-in-out origin-top-left",
        displayMode === 'closed' ? 'w-16' : displayMode === 'icons' ? 'w-16' : 'w-48'
      )}>
        <ToolboxToggle
          displayMode={displayMode}
          cyclePosition={cyclePosition}
          onToggle={toggleDisplayMode}
        />

        {/* Separator */}
        <div className="h-px bg-[color:var(--stroke-color-950)]" />

        {/* Tools section */}
        <div className={cn(
          "transition-all duration-300 ease-in-out",
          displayMode === 'closed' ? 'max-h-[80px]' : 'max-h-[400px]'
        )}>
          <div className="py-2 relative flex flex-col overflow-visible" role="toolbar" aria-label="Map tools">
            {TOOLS.map((tool, index) => (
              <ToolButton
                key={tool.id}
                tool={tool}
                index={index}
                totalTools={TOOLS.length}
                isActive={activeTool === tool.id}
                isDisabled={disabledTools.has(tool.id)}
                displayMode={displayMode}
                cyclePosition={cyclePosition}
                onClick={handleToolClick}
              />
            ))}
          </div>
        </div>

        {/* Theme toggle section */}
        {displayMode !== 'closed' && (
          <>
            <div className="h-px bg-[color:var(--stroke-color-950)]" />
              <div className="px-2">
                <ThemeToolButton
                  theme={theme}
                  displayMode={displayMode}
                  onClick={toggleTheme}
                />
              </div>
          </>
        )}
      </div>
    </div>
  );
}

// Custom theme toggle button with specific hover colors
function ThemeToolButton({ 
  theme, 
  displayMode, 
  onClick 
}: { 
  theme: 'light' | 'dark';
  displayMode: 'closed' | 'icons' | 'full';
  onClick: () => void;
}) {
  const [isHovering, setIsHovering] = React.useState(false);
  
  const Icon = theme === 'dark' ? Sun : Moon;
  const label = theme === 'dark' ? 'Light' : 'Dark';
  
  return (
    <div className="relative overflow-visible">
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={cn(
          "w-full h-10 flex items-center rounded-lg relative",
          "transition-all duration-200",
          "focus:outline-none focus-visible:outline-none outline-none"
        )}
        aria-label={`Switch to ${label.toLowerCase()} mode`}
      >
      <div className={cn(
        "w-full h-full flex items-center",
        displayMode === 'full' ? "justify-between gap-2 px-3.5" : "justify-center px-2"
      )}>
        <div className="flex items-center justify-center gap-4">
          <div className="w-5 flex items-center justify-start">
            <Icon className={cn(
              "w-5 h-5 flex-shrink-0 transition-colors duration-200",
              theme === 'dark' 
                ? (isHovering ? "text-amber-600" : "text-neutral-700 dark:text-neutral-300")
                : (isHovering ? "text-violet-600" : "text-neutral-700 dark:text-neutral-300")
            )} />
          </div>
          <span className={cn(
            "text-sm font-medium transition-all duration-300",
            displayMode === 'full' ? "opacity-100 flex-1 w-auto" : "hidden",
            isHovering 
              ? (theme === 'dark' ? "text-amber-600" : "text-violet-600")
              : "text-neutral-700 dark:text-neutral-300"
          )}>
            {label}
          </span>
        </div>
      </div>
    </button>
    
    <ToolTooltip
      label={label}
      shortcut=""
      show={isHovering && displayMode === 'icons'}
    />
  </div>
  );
}