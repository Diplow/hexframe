import { useCallback } from 'react';
import type { Command } from '~/app/map/Chat/Input/_commands';
import type { useChatOperations } from '~/app/map/Chat/_state/_operations';

type ChatOperations = ReturnType<typeof useChatOperations>;

interface CommandHandlers {
  handleLogout: () => Promise<void>;
  handleLogin: () => void;
  handleRegister: () => void;
  handleClear: () => void;
  handleMcpCommand: (commandPath: string) => void;
  chatState: ChatOperations;
}

/**
 * Custom hook for command execution logic
 */
export function useCommandExecution(
  extendedCommands: Record<string, Command>,
  handlers: CommandHandlers
) {
  const findCommand = useCallback((path: string): Command | null => {
    // Try exact match first
    if (extendedCommands[path]) {
      return extendedCommands[path];
    }

    // Try without trailing slash if path ends with '/'
    if (path.endsWith('/') && path.length > 1) {
      const pathWithoutSlash = path.slice(0, -1);
      if (extendedCommands[pathWithoutSlash]) {
        return extendedCommands[pathWithoutSlash];
      }
    }

    return null;
  }, [extendedCommands]);

  const executeCommand = useCallback(async (commandPath: string): Promise<string> => {
    const command = findCommand(commandPath);

    if (!command) {
      return `Unknown command: ${commandPath}. Type '/' to see available commands.`;
    }

    // Handle special commands that need side effects
    // Normalize command path by removing trailing slash for switch matching
    const normalizedPath = commandPath.endsWith('/') && commandPath.length > 1
      ? commandPath.slice(0, -1)
      : commandPath;

    switch (normalizedPath) {
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
        handlers.handleMcpCommand(normalizedPath);
        return '';
      default:
        if (command.action) {
          try {
            const result = command.action();

            // For debug commands, create a debug logs widget
            if (result && result.trim().length > 0) {
              if (normalizedPath.startsWith('/debug')) {
                // Extract debug command info for widget title
                const title = 'Debug Logs';

                // Show debug logs widget
                handlers.chatState.showDebugLogsWidget(title, result);
              } else {
                handlers.chatState.sendAssistantMessage(result);
              }
            }
            return '';
          } catch (error) {
            console.error(`Command execution failed for ${commandPath}:`, error);
            const errorMsg = `Command execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
            if (handlers.chatState && 'showSystemMessage' in handlers.chatState) {
              handlers.chatState.showSystemMessage(errorMsg, 'error');
            }
            return '';
          }
        }
        const noActionMsg = `Command ${commandPath} has no action defined.`;
        if (handlers.chatState && 'showSystemMessage' in handlers.chatState) {
          handlers.chatState.showSystemMessage(noActionMsg, 'error');
        }
        return '';
    }
  }, [findCommand, handlers]);

  return {
    findCommand,
    executeCommand
  };
}