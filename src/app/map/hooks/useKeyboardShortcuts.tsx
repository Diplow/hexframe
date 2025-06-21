import { useEffect } from 'react';
import { useTileActions } from '../Canvas/TileActionsContext';
import type { ToolType } from '../Canvas/TileActionsContext';

const TOOL_SHORTCUTS: Record<string, ToolType> = {
  'n': 'navigate',
  'N': 'navigate',
  'm': 'drag',
  'M': 'drag',
  'x': 'expand',
  'X': 'expand',
  'c': 'create',
  'C': 'create',
  'e': 'edit',
  'E': 'edit',
  'd': 'delete',
  'D': 'delete',
  'Escape': 'expand',
};

export function useKeyboardShortcuts() {
  const { setActiveTool } = useTileActions();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts when typing in input fields
      const target = event.target as HTMLElement | null;
      if (target) {
        const isEditable = 
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.contentEditable === 'true';
        
        if (isEditable) {
          return;
        }
      }

      // Ignore shortcuts when modifier keys are pressed
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      const tool = TOOL_SHORTCUTS[event.key];
      if (tool) {
        event.preventDefault();
        setActiveTool(tool);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [setActiveTool]);
}