import { chatSettings } from '~/app/map/Chat';
import { debugLogger } from '~/lib/debug/debug-logger';

interface Command {
  description: string;
  action?: () => string;
}

export const settingsCommands: Record<string, Command> = {
  '/settings': {
    description: 'Chat settings help (use /settings/messages or /settings/messages/status)',
  },
  '/settings/messages': {
    description: 'Message settings help (use /settings/messages/status or /settings/messages/toggle/*)',
  },
  '/settings/messages/toggle': {
    description: 'Toggle message types (use /settings/messages/toggle/tile/* or /settings/messages/toggle/debug)',
  },
  '/settings/messages/toggle/tile': {
    description: 'Toggle tile message types (use /settings/messages/toggle/tile/edit, create, delete, move, swap)',
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
      // Also update the debug logger to use console only
      debugLogger.setOptions({
        enableConsole: true,
        enableUI: false, // Never send to UI to prevent loops
      });
      return `Debug messages are now ${newState ? 'enabled' : 'disabled'} (console only)`;
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