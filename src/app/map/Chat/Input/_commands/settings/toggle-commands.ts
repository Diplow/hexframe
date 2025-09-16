import { chatSettings } from '~/app/map/Chat';
import { debugLogger } from '~/lib/debug/debug-logger';

interface Command {
  description: string;
  action?: () => string;
}

export const toggleCommands: Record<string, Command> = {
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
      // Also update the debug logger to use console only
      debugLogger.setOptions({
        enableConsole: true,
        enableUI: false, // Never send to UI to prevent loops
      });
      return `Debug messages are now ${newState ? 'enabled' : 'disabled'} (console only)`;
    }
  }
};