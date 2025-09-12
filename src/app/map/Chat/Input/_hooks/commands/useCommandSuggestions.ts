import { useCallback } from 'react';
import type { Command } from '~/app/map/Chat/Input/_commands';

/**
 * Custom hook for command suggestion logic
 */
export function useCommandSuggestions(extendedCommands: Record<string, Command>) {
  const getCommandSuggestions = useCallback((input: string) => {
    if (!input.startsWith('/')) {
      return [];
    }
    
    const matchingCommands = Object.entries(extendedCommands)
      .filter(([command]) => command.startsWith(input))
      .slice(0, 10)
      .map(([command, config]) => ({
        command,
        description: config.description
      }));
    
    return matchingCommands;
  }, [extendedCommands]);

  return { getCommandSuggestions };
}