import { useCallback } from 'react';
import { chatSettings, useChatState } from '~/app/map/Chat';
import { useMapCache } from '~/app/map/Cache';
import { debugLogger } from '~/lib/debug/debug-logger';
import { authClient } from '~/lib/auth';
import { useEventBus } from '~/app/map/Services';
import { CoordSystem } from '~/lib/domains/mapping/utils';

// UTF-8 safe base64 encoder
function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

interface Command {
  description: string;
  action?: () => string;
}

const getCommands = (center: string | null): Record<string, Command> => ({
  '/debug': {
    description: 'Show debug logs (use /debug/full or /debug/succinct)',
  },
  '/debug/full': {
    description: 'Show last 50 full debug logs (use /debug/full/X for custom limit)',
  },
  '/debug/full/10': {
    description: 'Show last 10 full debug logs',
    action: () => {
      const logs = debugLogger.formatLogs('full', 10);
      if (logs.length === 0) {
        return 'No debug logs available.';
      }
      const logContent = logs.join('\n');
      const result = `**Debug Logs (Full Mode - ${logs.length} messages):**\n\n\`\`\`\n${logContent}\n\`\`\`\n\n{{COPY_BUTTON:${toBase64(logContent)}}}`;
      
      // Generated debug command result
      
      return result;
    }
  },
  '/debug/full/25': {
    description: 'Show last 25 full debug logs',
    action: () => {
      const logs = debugLogger.formatLogs('full', 25);
      if (logs.length === 0) {
        return 'No debug logs available.';
      }
      const logContent = logs.join('\n');
      return `**Debug Logs (Full Mode - ${logs.length} messages):**\n\n\`\`\`\n${logContent}\n\`\`\`\n\n{{COPY_BUTTON:${toBase64(logContent)}}}`;
    }
  },
  '/debug/full/50': {
    description: 'Show last 50 full debug logs',
    action: () => {
      const logs = debugLogger.formatLogs('full', 50);
      if (logs.length === 0) {
        return 'No debug logs available.';
      }
      const logContent = logs.join('\n');
      return `**Debug Logs (Full Mode - ${logs.length} messages):**\n\n\`\`\`\n${logContent}\n\`\`\`\n\n{{COPY_BUTTON:${toBase64(logContent)}}}`;
    }
  },
  '/debug/full/100': {
    description: 'Show last 100 full debug logs',
    action: () => {
      const logs = debugLogger.formatLogs('full', 100);
      if (logs.length === 0) {
        return 'No debug logs available.';
      }
      const logContent = logs.join('\n');
      return `**Debug Logs (Full Mode - ${logs.length} messages):**\n\n\`\`\`\n${logContent}\n\`\`\`\n\n{{COPY_BUTTON:${toBase64(logContent)}}}`;
    }
  },
  '/debug/full/all': {
    description: 'Show all full debug logs',
    action: () => {
      const logs = debugLogger.formatLogs('full');
      if (logs.length === 0) {
        return 'No debug logs available.';
      }
      const logContent = logs.join('\n');
      return `**Debug Logs (Full Mode - ${logs.length} messages):**\n\n\`\`\`\n${logContent}\n\`\`\`\n\n{{COPY_BUTTON:${toBase64(logContent)}}}`;
    }
  },
  '/debug/succinct': {
    description: 'Show last 50 debug log groups (use /debug/succinct/X for custom limit)',
  },
  '/debug/succinct/10': {
    description: 'Show last 10 debug log groups',
    action: () => {
      const logs = debugLogger.formatLogs('succinct', 10);
      const totalMessages = debugLogger.getFullLogs().length;
      if (logs.length === 0) {
        return 'No debug logs available.';
      }
      const logContent = logs.join('\n');
      return `**Debug Logs (Succinct Mode - ${totalMessages} messages):**\n\n\`\`\`\n${logContent}\n\`\`\`\n\n{{COPY_BUTTON:${toBase64(logContent)}}}`;
    }
  },
  '/debug/succinct/25': {
    description: 'Show last 25 debug log groups',
    action: () => {
      const logs = debugLogger.formatLogs('succinct', 25);
      const totalMessages = debugLogger.getFullLogs().length;
      if (logs.length === 0) {
        return 'No debug logs available.';
      }
      const logContent = logs.join('\n');
      return `**Debug Logs (Succinct Mode - ${totalMessages} messages):**\n\n\`\`\`\n${logContent}\n\`\`\`\n\n{{COPY_BUTTON:${toBase64(logContent)}}}`;
    }
  },
  '/debug/succinct/50': {
    description: 'Show last 50 debug log groups',
    action: () => {
      const logs = debugLogger.formatLogs('succinct', 50);
      const totalMessages = debugLogger.getFullLogs().length;
      if (logs.length === 0) {
        return 'No debug logs available.';
      }
      const logContent = logs.join('\n');
      return `**Debug Logs (Succinct Mode - ${totalMessages} messages):**\n\n\`\`\`\n${logContent}\n\`\`\`\n\n{{COPY_BUTTON:${toBase64(logContent)}}}`;
    }
  },
  '/debug/succinct/100': {
    description: 'Show last 100 debug log groups',
    action: () => {
      const logs = debugLogger.formatLogs('succinct', 100);
      const totalMessages = debugLogger.getFullLogs().length;
      if (logs.length === 0) {
        return 'No debug logs available.';
      }
      const logContent = logs.join('\n');
      return `**Debug Logs (Succinct Mode - ${totalMessages} messages):**\n\n\`\`\`\n${logContent}\n\`\`\`\n\n{{COPY_BUTTON:${toBase64(logContent)}}}`;
    }
  },
  '/debug/succinct/all': {
    description: 'Show all debug log groups',
    action: () => {
      const logs = debugLogger.formatLogs('succinct');
      const totalMessages = debugLogger.getFullLogs().length;
      if (logs.length === 0) {
        return 'No debug logs available.';
      }
      const logContent = logs.join('\n');
      return `**Debug Logs (Succinct Mode - ${totalMessages} messages):**\n\n\`\`\`\n${logContent}\n\`\`\`\n\n{{COPY_BUTTON:${toBase64(logContent)}}}`;
    }
  },
  '/debug/clear': {
    description: 'Clear all debug logs',
    action: () => {
      debugLogger.clearBuffer();
      return 'Debug log buffer cleared.';
    }
  },
  '/debug/console': {
    description: 'Toggle console logging',
    action: () => {
      const options = debugLogger.getOptions();
      const newState = !options.enableConsole;
      debugLogger.setOptions({ enableConsole: newState });
      return `Console logging is now ${newState ? 'enabled' : 'disabled'}.`;
    }
  },
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
  },
  '/logout': {
    description: 'Log out from your account',
    action: () => {
      // This will be handled specially in executeCommand
      return '';
    }
  },
  '/login': {
    description: 'Open login form',
    action: () => {
      // This will be handled specially in executeCommand
      return '';
    }
  },
  '/register': {
    description: 'Open registration form',
    action: () => {
      // This will be handled specially in executeCommand
      return '';
    }
  },
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
  },
  '/mcp': {
    description: 'MCP API key management',
  },
  '/mcp/key': {
    description: 'API key operations',
  },
  '/mcp/key/create': {
    description: 'Create new MCP API key (requires password confirmation)',
    action: () => {
      // This will be handled specially in executeCommand to show password prompt
      return '';
    }
  },
  '/mcp/key/list': {
    description: 'List active MCP API keys',
    action: () => {
      // This will be handled specially in executeCommand
      return '';
    }
  },
  '/mcp/key/revoke': {
    description: 'Revoke an MCP API key',
    action: () => {
      // This will be handled specially in executeCommand
      return '';
    }
  },
  '/mcp/status': {
    description: 'Check MCP server connection and configuration',
    action: () => {
      return `**MCP Server Status**

To use MCP with Hexframe:

1. **Create an API key**: Use \`/mcp/key/create\` 
2. **Configure Claude Code**: 
   \`\`\`bash
   claude mcp add hexframe "node dist/mcp-server.js" --env HEXFRAME_API_KEY=your_key_here
   \`\`\`
3. **Build MCP server**: \`pnpm mcp:build\`
4. **Test connection**: Try using MCP tools in Claude Code

**Available MCP Tools:**
- \`getItemsForRootItem\` - Get hierarchical tile structure
- \`getItemByCoords\` - Get single tile by coordinates  
- \`addItem\` - Create new tile (requires API key)
- \`updateItem\` - Update existing tile (requires API key)

For more help, use \`/mcp/key/create\` to get started.`;
    }
  }
});

export function useCommandHandling() {
  const chatState = useChatState();
  const { navigateToItem, center } = useMapCache();
  const eventBus = useEventBus();

  const commands = getCommands(center);
  
  const findCommand = useCallback((path: string): Command | null => {
    return commands[path] ?? null;
  }, [commands]);

  const handleLogout = useCallback(async () => {
    try {
      // Clear debug logs
      debugLogger.clearBuffer();
      
      // Sign out using auth client (will handle "not logged in" gracefully)
      await authClient.signOut();
      
      // Clear chat
      if (chatState && 'clearChat' in chatState) {
        chatState.clearChat();
      }
      
      // No need for logout success message since chat is cleared
    } catch (error) {
      console.error('Logout failed:', error);
      
      // Show error message
      if (chatState && 'showSystemMessage' in chatState) {
        chatState.showSystemMessage('Logout failed. Please try again.', 'error');
      }
    }
  }, [chatState]);

  const handleLogin = useCallback(() => {
    // Emit auth.required event to show login widget
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
    // Emit auth.required event to show registration widget
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
    // Clear debug logs
    debugLogger.clearBuffer();
    
    // Clear chat timeline
    chatState.clearChat();
    
    // Show confirmation message
    chatState.showSystemMessage('Message timeline cleared.', 'info');
  }, [chatState]);

  const handleMcpKeyCreate = useCallback(() => {
    chatState.showSystemMessage(`**Create MCP API Key**

To create an API key for MCP access, you need to:

1. **Enter a name for your key** (e.g., "Claude Code MCP")
2. **Confirm your password** for security

⚠️ **Important**: The API key will only be shown once. Copy it immediately and add it to your Claude Code MCP configuration.

*Note: Password confirmation is not yet implemented in this UI. For now, you can create keys directly via the API or wait for the full implementation.*

**Next steps after key creation:**
\`\`\`bash
# Add to Claude Code
claude mcp add hexframe "node dist/mcp-server.js" --env HEXFRAME_API_KEY=your_key_here

# Build MCP server
pnpm mcp:build
\`\`\``, 'info');
  }, [chatState]);

  const handleMcpKeyList = useCallback(async () => {
    try {
      // TODO: Call the tRPC endpoint to list keys
      // For now, show a placeholder message
      chatState.showSystemMessage(`**MCP API Keys**

*This feature is not yet fully implemented.*

Your active MCP API keys will be displayed here, showing:
- Key name
- Created date  
- Last used date
- Status (active/expired)

Use \`/mcp/key/create\` to create a new key.`, 'info');
    } catch (error) {
      chatState.showSystemMessage(`Failed to list API keys: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }, [chatState]);

  const handleMcpKeyRevoke = useCallback(async () => {
    try {
      // TODO: Show a prompt to select which key to revoke
      chatState.showSystemMessage(`**Revoke MCP API Key**

*This feature is not yet fully implemented.*

This will show a list of your active keys and allow you to revoke them.

⚠️ **Warning**: Revoking a key will immediately disable MCP access using that key.`, 'info');
    } catch (error) {
      chatState.showSystemMessage(`Failed to revoke API key: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }, [chatState]);

  const getCommandSuggestions = useCallback((input: string) => {
    if (!input.startsWith('/')) {
      return [];
    }
    
    const normalizedInput = input.toLowerCase();
    
    // Count the number of slashes in input to determine the current level
    const inputSlashCount = (normalizedInput.match(/\//g) ?? []).length;
    
    // Get commands that start with the input
    const matchingCommands = Object.keys(commands)
      .filter(cmd => cmd.toLowerCase().startsWith(normalizedInput));
    
    // Filter to show only the next immediate level
    const nextLevelCommands = new Set<string>();
    
    matchingCommands.forEach(cmd => {
      const cmdSlashCount = (cmd.match(/\//g) ?? []).length;
      
      if (cmdSlashCount === inputSlashCount) {
        // Same level as input - include if it's an exact match or extension
        nextLevelCommands.add(cmd);
      } else if (cmdSlashCount === inputSlashCount + 1) {
        // Next level down - include it
        nextLevelCommands.add(cmd);
      }
      // Ignore deeper levels (more than one level down)
    });
    
    // Convert to the expected format and sort
    const suggestions = Array.from(nextLevelCommands)
      .map(cmd => ({
        command: cmd,
        description: commands[cmd]?.description ?? '',
        isExact: cmd.toLowerCase() === normalizedInput
      }))
      .sort((a, b) => {
        // Exact matches first
        if (a.isExact && !b.isExact) return -1;
        if (!a.isExact && b.isExact) return 1;
        // Then by length (shorter first)
        if (a.command.length !== b.command.length) {
          return a.command.length - b.command.length;
        }
        // Then alphabetically
        return a.command.localeCompare(b.command);
      });

    return suggestions;
  }, [commands]);

  const executeCommand = useCallback((cmd: string): boolean => {
    const normalizedCmd = cmd.replace(/\/+$/, '');
    const command = findCommand(normalizedCmd);
    
    if (!command) {
      return false;
    }
    
    // Handle special auth commands
    if (normalizedCmd === '/logout') {
      void handleLogout();
      return true;
    }
    
    if (normalizedCmd === '/login') {
      handleLogin();
      return true;
    }
    
    if (normalizedCmd === '/register') {
      handleRegister();
      return true;
    }
    
    if (normalizedCmd === '/clear') {
      handleClear();
      return true;
    }
    
    // Handle special MCP commands
    if (normalizedCmd === '/mcp/key/create') {
      handleMcpKeyCreate();
      return true;
    }
    
    if (normalizedCmd === '/mcp/key/list') {
      void handleMcpKeyList();
      return true;
    }
    
    if (normalizedCmd === '/mcp/key/revoke') {
      void handleMcpKeyRevoke();
      return true;
    }
    
    if (command.action) {
      const result = command.action();
      if (result) { // Only show message if there's content
        if (chatState && 'showSystemMessage' in chatState) {
          chatState.showSystemMessage(result, 'info');
        }
      }
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
        `[${command}](#hexframe-command:${command}) - ${description}`
      ).join('\n')}`;
      
      if (chatState && 'showSystemMessage' in chatState) {
        chatState.showSystemMessage(helpText, 'info');
      }
      return true;
    }
    
    return false;
  }, [chatState, findCommand, handleClear, handleLogin, handleLogout, handleRegister, handleMcpKeyCreate, handleMcpKeyList, handleMcpKeyRevoke, commands]);

  const executeCommandFromPayload = useCallback(async (payload: { command: string }) => {
    // Handle special navigation commands
    if (payload.command.startsWith('navigate:')) {
      const parts = payload.command.split(':');
      if (parts.length >= 3 && parts[1] && parts[2]) {
        const tileId = parts[1];
        let tileName = parts[2];
        
        // Navigation command received
        
        try {
          try {
            tileName = decodeURIComponent(parts[2]);
          } catch {
            // Leave tileName as provided if decoding fails
          }
          // Calling navigateToItem
          await navigateToItem(tileId);
          // Navigation successful
          
          if (chatState && 'showSystemMessage' in chatState) {
            chatState.showSystemMessage(`Navigated to "${tileName}"`, 'info');
          }
        } catch (error) {
          console.error('[CommandHandling] ❌ Navigation failed:', error);
          if (chatState && 'showSystemMessage' in chatState) {
            chatState.showSystemMessage(`Failed to navigate to "${tileName}": ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
          }
        }
        return;
      }
    }
    
    // Execute the command directly (no user message for button clicks)
    const command = commands[payload.command];
    if (command) {
      if (command.action) {
        const result = command.action();
        if (chatState && 'showSystemMessage' in chatState) {
          chatState.showSystemMessage(result, 'info');
        }
      } else {
        executeCommand(payload.command);
      }
    } else if (payload.command.startsWith('/')) {
      if (chatState && 'showSystemMessage' in chatState) {
        chatState.showSystemMessage(`Command not found: ${payload.command}`, 'error');
      }
    }
  }, [chatState, executeCommand, navigateToItem, commands]);

  return {
    executeCommand,
    executeCommandFromPayload,
    getCommandSuggestions,
    getAllCommands: () => Object.keys(commands),
  };
}