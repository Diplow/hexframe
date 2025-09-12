import { useCallback, useMemo } from 'react';
import { useChatState } from '~/app/map/Chat';
import { useMapCache } from '~/app/map/Cache';
import { debugLogger } from '~/lib/debug/debug-logger';
import { authClient } from '~/lib/auth';
import { useEventBus } from '~/app/map/Services';
import { CoordSystem } from '~/lib/domains/mapping/utils';
import { getAllCommands, type Command } from '~/app/map/Chat/Input/_commands';

// UTF-8 safe base64 encoder
function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function useCommandHandling() {
  const chatState = useChatState();
  const { center } = useMapCache();
  const eventBus = useEventBus();

  const commands = getAllCommands(center);
  
  // Add special commands that require closure access
  const extendedCommands = useMemo(() => ({
    ...commands,
    '/clear': {
      description: 'Clear message timeline',
      action: () => {
        // This will be handled specially in executeCommand
        return '';
      }
    },
    '/coords': {
      description: 'Get current center coordinate in JSON format',
      action: () => {
        if (!center) {
          return 'No current center coordinate available.';
        }
        
        try {
          const coords = CoordSystem.parseId(center);
          const coordsJson = JSON.stringify(coords, null, 0);
          return `Current center coordinates: \`${coordsJson}\`\n\n{{COPY_BUTTON:${toBase64(coordsJson)}}}`;
        } catch (error) {
          return `Error parsing coordinate: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    }
  }), [commands, center]);
  
  const findCommand = useCallback((path: string): Command | null => {
    return (extendedCommands as Record<string, Command>)[path] ?? null;
  }, [extendedCommands]);

  const handleLogout = useCallback(async () => {
    try {
      debugLogger.clearBuffer();
      await authClient.signOut();
      
      if (chatState && 'clearChat' in chatState) {
        chatState.clearChat();
      }
    } catch (error) {
      console.error('Logout failed:', error);
      
      if (chatState && 'showSystemMessage' in chatState) {
        chatState.showSystemMessage('Logout failed. Please try again.', 'error');
      }
    }
  }, [chatState]);

  const handleLogin = useCallback(() => {
    eventBus.emit({
      type: 'auth.required' as const,
      payload: {
        reason: 'Please log in to access this feature'
      },
      source: 'map_cache' as const,
      timestamp: new Date()
    });
  }, [eventBus]);

  const handleRegister = useCallback(() => {
    eventBus.emit({
      type: 'auth.required' as const,
      payload: {
        reason: 'Create an account to get started'
      },
      source: 'map_cache' as const,
      timestamp: new Date()
    });
  }, [eventBus]);

  const handleClear = useCallback(() => {
    debugLogger.clearBuffer();
    chatState.clearChat();
    chatState.showSystemMessage('Message timeline cleared.', 'info');
  }, [chatState]);

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

  const executeCommand = useCallback(async (commandPath: string): Promise<string> => {
    const command = findCommand(commandPath);
    
    if (!command) {
      return `Unknown command: ${commandPath}. Type '/' to see available commands.`;
    }

    // Handle special commands that need side effects
    switch (commandPath) {
      case '/logout':
        await handleLogout();
        return '';
      case '/login':
        handleLogin();
        return '';
      case '/register':
        handleRegister();
        return '';
      case '/clear':
        handleClear();
        return '';
      case '/mcp':
      case '/mcp/key':
      case '/mcp/key/create':
      case '/mcp/key/list':
      case '/mcp/key/revoke':
        eventBus.emit({
          type: 'widget.create' as const,
          payload: {
            widget: {
              id: `mcp-keys-${Date.now()}`,
              type: 'mcp-keys',
              data: { action: commandPath },
              priority: 'action' as const,
              timestamp: new Date(),
            }
          },
          source: 'chat_cache' as const,
          timestamp: new Date()
        });
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
  }, [findCommand, handleLogout, handleLogin, handleRegister, handleClear, eventBus]);

  return {
    findCommand,
    getCommandSuggestions,
    executeCommand
  };
}