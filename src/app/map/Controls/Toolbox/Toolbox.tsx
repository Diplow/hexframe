"use client";

import { cn } from '~/lib/utils';
import { useTileActions } from '../../Canvas/TileActionsContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useToolboxCycle } from './_hooks/useToolboxCycle';
import { useToolboxKeyboard } from './_hooks/useToolboxKeyboard';
import { calculateToolboxTopOffset } from './_utils/toolbox-layout';
import { ToolboxToggle } from './_components/ToolboxToggle';
import { ToolButton, type ToolConfig } from './_components/ToolButton';
import { ThemeToggle } from '~/components/ThemeToggle';
import { 
  Navigation, 
  Plus, 
  Edit, 
  Trash2, 
  Maximize2,
  Move,
} from 'lucide-react';
import type { ToolType } from '../../Canvas/TileActionsContext';

const TOOLS: ToolConfig[] = [
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
        "bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700 rounded-lg",
        "transition-all duration-300 ease-in-out origin-top-left",
        displayMode === 'closed' ? 'w-16' : displayMode === 'icons' ? 'w-16' : 'w-48'
      )}>
        <ToolboxToggle
          displayMode={displayMode}
          cyclePosition={cyclePosition}
          onToggle={toggleDisplayMode}
        />

        {/* Separator */}
        <div className="h-px bg-gray-200 dark:bg-gray-700" />

        {/* Tools section */}
        <div className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          displayMode === 'closed' ? 'max-h-[80px]' : 'max-h-[400px]'
        )}>
          <div className="p-2 relative flex flex-col" role="toolbar" aria-label="Map tools">
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
            <div className="h-px bg-gray-200 dark:bg-gray-700" />
            <div className="p-2">
              <ThemeToggle 
                className="w-full justify-center"
                showLabel={displayMode === 'full'}
                size={displayMode === 'full' ? 'md' : 'sm'}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}