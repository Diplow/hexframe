import { useMemo } from 'react';
import { getAllCommands } from '~/app/map/Chat/Input/_commands';

/**
 * Custom hook for creating extended commands with runtime data
 */
export function useSpecialCommands(center: string | null) {
  const baseCommands = getAllCommands(center);
  
  const extendedCommands = useMemo(() => ({
    ...baseCommands,
    '/clear': {
      description: 'Clear message timeline',
        preview: undefined,
      action: () => {
        // This will be handled specially in executeCommand
        return '';
      }
    },
  }), [baseCommands]);

  return { extendedCommands };
}