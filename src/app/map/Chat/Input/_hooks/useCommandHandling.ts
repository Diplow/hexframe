import { useCallback } from 'react';
import { chatSettings } from '../../_settings/chat-settings';
import { useChatCacheOperations } from '../../_cache/hooks/useChatCacheOperations';

interface Command {
  description: string;
  action?: () => string;
}

const commands: Record<string, Command> = {
  '/settings': {
    description: 'Chat settings',
  },
  '/settings/messages': {
    description: 'Message display settings',
  },
  '/settings/messages/toggle': {
    description: 'Toggle message types',
  },
  '/settings/messages/toggle/tile': {
    description: 'Tile operation messages',
  },
  '/settings/messages/toggle/tile/edit': {
    description: 'Toggle tile edit messages',
    action: () => {
      const newState = chatSettings.toggleTileEdit();
      return `Tile edit messages are now ${newState ? 'enabled' : 'disabled'}`;
    }
  },
  '/settings/messages/toggle/tile/create': {
    description: 'Toggle tile create messages',
    action: () => {
      const newState = chatSettings.toggleTileCreate();
      return `Tile create messages are now ${newState ? 'enabled' : 'disabled'}`;
    }
  },
  '/settings/messages/toggle/tile/delete': {
    description: 'Toggle tile delete messages',
    action: () => {
      const newState = chatSettings.toggleTileDelete();
      return `Tile delete messages are now ${newState ? 'enabled' : 'disabled'}`;
    }
  },
  '/settings/messages/toggle/tile/move': {
    description: 'Toggle tile move messages',
    action: () => {
      const newState = chatSettings.toggleTileMove();
      return `Tile move messages are now ${newState ? 'enabled' : 'disabled'}`;
    }
  },
  '/settings/messages/toggle/tile/swap': {
    description: 'Toggle tile swap messages',
    action: () => {
      const newState = chatSettings.toggleTileSwap();
      return `Tile swap messages are now ${newState ? 'enabled' : 'disabled'}`;
    }
  },
  '/settings/messages/toggle/debug': {
    description: 'Toggle debug messages (shows all bus events)',
    action: () => {
      const newState = chatSettings.toggleDebug();
      return `Debug messages are now ${newState ? 'enabled' : 'disabled'}`;
    }
  },
  '/settings/messages/status': {
    description: 'Show current message visibility settings',
    action: () => {
      const settings = chatSettings.getSettings();
      const tile = settings.messages.tile;
      return `**Current message settings:**
• Tile edit: ${tile.edit ? 'enabled' : 'disabled'}
• Tile create: ${tile.create ? 'enabled' : 'disabled'}
• Tile delete: ${tile.delete ? 'enabled' : 'disabled'}
• Tile move: ${tile.move ? 'enabled' : 'disabled'}
• Tile swap: ${tile.swap ? 'enabled' : 'disabled'}
• Debug mode: ${settings.messages.debug ? 'enabled' : 'disabled'}`;
    }
  },
  '/settings/messages/reset': {
    description: 'Reset all message settings to defaults',
    action: () => {
      chatSettings.resetToDefaults();
      return 'All message settings have been reset to defaults.';
    }
  }
};

export function useCommandHandling() {
  const { dispatch } = useChatCacheOperations();

  const findCommand = useCallback((path: string): Command | null => {
    return commands[path] ?? null;
  }, []);

  const executeCommand = useCallback((cmd: string): boolean => {
    const normalizedCmd = cmd.replace(/\/+$/, '');
    const command = findCommand(normalizedCmd);
    
    if (!command) {
      return false;
    }
    
    if (command.action) {
      const result = command.action();
      dispatch({
        type: 'message',
        payload: {
          content: result,
          actor: 'system',
        },
        id: `cmd-result-${Date.now()}`,
        timestamp: new Date(),
        actor: 'system',
      });
      return true;
    }
    
    const subcommands = Object.keys(commands)
      .filter(key => key.startsWith(normalizedCmd + '/') && key !== normalizedCmd)
      .map(key => ({
        command: key,
        description: commands[key]?.description ?? ''
      }))
      .filter(({ command }) => {
        const remainder = command.slice(normalizedCmd.length + 1);
        return remainder && !remainder.includes('/');
      });
    
    if (subcommands.length > 0) {
      const currentDesc = command.description ? `${normalizedCmd} - ${command.description}\n\n` : '';
      const helpText = `${currentDesc}Available commands:\n\n${subcommands.map(({ command, description }) => 
        `[${command}](command:${command}) - ${description}`
      ).join('  \n')}`;
      
      dispatch({
        type: 'message',
        payload: {
          content: helpText,
          actor: 'system',
        },
        id: `cmd-help-${Date.now()}`,
        timestamp: new Date(),
        actor: 'system',
      });
      return true;
    }
    
    return false;
  }, [dispatch, findCommand]);

  const executeCommandFromPayload = useCallback((payload: { command: string }) => {
    const command = commands[payload.command];
    if (command) {
      if (command.action) {
        const result = command.action();
        dispatch({
          type: 'message',
          payload: {
            content: result,
            actor: 'system',
          },
          id: `cmd-result-${Date.now()}`,
          timestamp: new Date(),
          actor: 'system',
        });
      } else {
        executeCommand(payload.command);
      }
    } else {
      dispatch({
        type: 'message',
        payload: {
          content: `Command not found: ${payload.command}`,
          actor: 'system',
        },
        id: `cmd-error-${Date.now()}`,
        timestamp: new Date(),
        actor: 'system',
      });
    }
  }, [dispatch, executeCommand]);

  return {
    executeCommand,
    executeCommandFromPayload,
  };
}