import { useCallback } from 'react';
import type { Command } from '~/app/map/Chat/Input/_commands';

interface CommandHandlers {
  handleLogout: () => Promise<void>;
  handleLogin: () => void;
  handleRegister: () => void;
  handleClear: () => void;
  handleMcpCommand: (commandPath: string) => void;
}

/**
 * Custom hook for command execution logic
 */
export function useCommandExecution(
  extendedCommands: Record<string, Command>,
  handlers: CommandHandlers
) {
  const findCommand = useCallback((path: string): Command | null => {
    return extendedCommands[path] ?? null;
  }, [extendedCommands]);

  const executeCommand = useCallback(async (commandPath: string): Promise<string> => {
    const command = findCommand(commandPath);
    
    if (!command) {
      return `Unknown command: ${commandPath}. Type '/' to see available commands.`;
    }

    // Handle special commands that need side effects
    switch (commandPath) {
      case '/logout':
        await handlers.handleLogout();
        return '';
      case '/login':
        handlers.handleLogin();
        return '';
      case '/register':
        handlers.handleRegister();
        return '';
      case '/clear':
        handlers.handleClear();
        return '';
      case '/mcp':
      case '/mcp/key':
      case '/mcp/key/create':
      case '/mcp/key/list':
      case '/mcp/key/revoke':
        handlers.handleMcpCommand(commandPath);
        return '';
      default:
        if (command.action) {
          try {
            return command.action();
          } catch (error) {
            console.error(`Command execution failed for ${commandPath}:`, error);
            return `Command execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        }
        return `Command ${commandPath} has no action defined.`;
    }
  }, [findCommand, handlers]);

  return {
    findCommand,
    executeCommand
  };
}