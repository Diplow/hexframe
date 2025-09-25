import { useCallback } from 'react';
import { debugLogger } from '~/lib/debug/debug-logger';
import { authClient } from '~/lib/auth';
import { useEventBus } from '~/app/map/Services';

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

  return {
    handleLogout,
    handleLogin,
    handleRegister,
    handleClear,
    handleMcpCommand
  };
}