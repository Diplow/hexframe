import type { ChatEvent, ToolCallWidgetData } from '~/app/map/Chat/_state/_events';

/**
 * Widget-related operations
 */
export function createWidgetOperations(dispatch: (event: ChatEvent) => void) {
  return {
    showAIResponseWidget(data: { jobId?: string; initialResponse?: string; model?: string }) {
      const widget = {
        id: `ai-response-${Date.now()}`,
        type: 'ai-response' as const,
        data,
        priority: 'info' as const,
        timestamp: new Date()
      }
      dispatch({
        type: 'widget_created' as const,
        payload: { widget },
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        actor: 'assistant' as const
      });
    },
    showMcpKeysWidget() {
      const widget = {
        id: `mcp-keys-${Date.now()}`,
        type: 'mcp-keys' as const,
        data: {},
        priority: 'action' as const,
        timestamp: new Date()
      }
      dispatch({
        type: 'widget_created' as const,
        payload: { widget },
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        actor: 'system' as const
      });
    },
    showDebugLogsWidget(title: string, content: string) {
      const widget = {
        id: `debug-logs-${Date.now()}`,
        type: 'debug-logs' as const,
        data: { title, content },
        priority: 'info' as const,
        timestamp: new Date()
      }
      dispatch({
        type: 'widget_created' as const,
        payload: { widget },
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        actor: 'system' as const
      });
    },
    showFavoritesWidget(data?: { editShortcutForMapItemId?: string }) {
      const widget = {
        id: `favorites-${Date.now()}`,
        type: 'favorites' as const,
        data: data ?? {},
        priority: 'action' as const,
        timestamp: new Date()
      }
      dispatch({
        type: 'widget_created' as const,
        payload: { widget },
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        actor: 'system' as const
      });
    },
    closeWidget(widgetId: string) {
      dispatch({
        type: 'widget_closed',
        payload: { widgetId },
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        actor: 'user',
      });
    },
    showToolCallWidget(data: Omit<ToolCallWidgetData, 'status' | 'result'>) {
      const widget = {
        id: `tool-call-${data.toolCallId}`,
        type: 'tool-call' as const,
        data: {
          ...data,
          status: 'running' as const,
        },
        priority: 'info' as const,
        timestamp: new Date(),
      };
      dispatch({
        type: 'widget_created' as const,
        payload: { widget },
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        actor: 'assistant' as const,
      });
    },
    updateToolCallWidget(toolCallId: string, result: string, success: boolean) {
      dispatch({
        type: 'widget_resolved' as const,
        payload: {
          widgetId: `tool-call-${toolCallId}`,
          result,
          status: success ? 'completed' : 'failed',
        },
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        actor: 'assistant' as const,
      });
    },
  };
}