import { useCallback } from 'react';
import { debugLogger } from '~/lib/debug/debug-logger';
import { authClient } from '~/lib/auth';
import { useEventBus } from '~/app/map/Services/EventBus';

/**
 * Custom hook providing command handler functions
 */
export function useCommandHandlers(chatState: {
  clearChat: () => void;
  showSystemMessage: (message: string, level?: 'info' | 'warning' | 'error') => void;
}) {
  const eventBus = useEventBus();

  const handleLogout = useCallback(async () => {
    try {
      debugLogger.clearBuffer();
      await authClient.signOut();

      // Emit logout event to trigger cache invalidation and chat clearing
      // This ensures consistent behavior whether logout is triggered via
      // /logout command or the logout button in ChatHeader
      eventBus.emit({
        type: 'auth.logout',
        payload: {},
        source: 'auth' as const,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Logout failed:', error);

      if (chatState && 'showSystemMessage' in chatState) {
        chatState.showSystemMessage('Logout failed. Please try again.', 'error');
      }
    }
  }, [eventBus, chatState]);

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

  const handleMcpCommand = useCallback((_commandPath: string) => {
    if (chatState && 'showMcpKeysWidget' in chatState && 'closeWidget' in chatState) {
      const showWidget = chatState.showMcpKeysWidget as () => void;
      const closeWidget = chatState.closeWidget as (widgetId: string) => void;

      // Check if we have access to current widgets to determine toggle behavior
      if ('getActiveWidgets' in chatState) {
        const getActiveWidgets = chatState.getActiveWidgets as () => Array<{ id: string; type: string }>;
        const activeWidgets = getActiveWidgets();
        const existingMcpWidget = activeWidgets.find(widget => widget.type === 'mcp-keys');

        if (existingMcpWidget) {
          // Close existing MCP widget
          closeWidget(existingMcpWidget.id);
        } else {
          // Open new MCP widget
          showWidget();
        }
      } else {
        // Fallback: just open the widget
        showWidget();
      }
    } else {
      console.error('chatState.showMcpKeysWidget or closeWidget not available');
    }
  }, [chatState]);

  const handleFavoritesCommand = useCallback((_commandPath: string) => {
    if (chatState && 'showFavoritesWidget' in chatState && 'closeWidget' in chatState) {
      const showWidget = chatState.showFavoritesWidget as () => void;
      const closeWidget = chatState.closeWidget as (widgetId: string) => void;

      // Check if we have access to current widgets to determine toggle behavior
      if ('getActiveWidgets' in chatState) {
        const getActiveWidgets = chatState.getActiveWidgets as () => Array<{ id: string; type: string }>;
        const activeWidgets = getActiveWidgets();
        const existingFavoritesWidget = activeWidgets.find(widget => widget.type === 'favorites');

        if (existingFavoritesWidget) {
          // Close existing favorites widget
          closeWidget(existingFavoritesWidget.id);
        } else {
          // Open new favorites widget
          showWidget();
        }
      } else {
        // Fallback: just open the widget
        showWidget();
      }
    } else {
      console.error('chatState.showFavoritesWidget or closeWidget not available');
    }
  }, [chatState]);

  const handleRunCommand = useCallback((commandInput: string) => {
    if (!chatState) return;

    // Parse the command input to extract optional coords
    // Format: /run or /run userId,0:1,2
    const trimmedInput = commandInput.trim();
    const coordsMatch = /^\/run\s+(.+)$/.exec(trimmedInput);

    if (coordsMatch?.[1]) {
      // Has coords argument - show RunWidget for specific tile
      const tileCoords = coordsMatch[1].trim();
      if ('showRunWidget' in chatState) {
        const showWidget = chatState.showRunWidget as (data: { tileCoords: string; tileTitle: string }) => void;
        // Title will be fetched by the widget itself
        showWidget({ tileCoords, tileTitle: 'Loading...' });
      }
    } else {
      // No coords - show RunsListWidget
      if ('showRunsListWidget' in chatState && 'closeWidget' in chatState) {
        const showWidget = chatState.showRunsListWidget as () => void;
        const closeWidget = chatState.closeWidget as (widgetId: string) => void;

        // Toggle behavior: close if already open
        if ('getActiveWidgets' in chatState) {
          const getActiveWidgets = chatState.getActiveWidgets as () => Array<{ id: string; type: string }>;
          const activeWidgets = getActiveWidgets();
          const existingRunsListWidget = activeWidgets.find(widget => widget.type === 'runs-list');

          if (existingRunsListWidget) {
            closeWidget(existingRunsListWidget.id);
          } else {
            showWidget();
          }
        } else {
          showWidget();
        }
      }
    }
  }, [chatState]);

  return {
    handleLogout,
    handleLogin,
    handleRegister,
    handleClear,
    handleMcpCommand,
    handleFavoritesCommand,
    handleRunCommand
  };
}