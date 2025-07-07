import { useChatCacheOperations } from '../../Cache/hooks/useChatCacheOperations';

export function useChatEventDispatcher() {
  const { dispatch } = useChatCacheOperations();

  const dispatchWidgetResolved = (widgetId: string, action: string) => {
    dispatch({
      type: 'widget_resolved',
      payload: { widgetId, action },
      id: `auth-success-${Date.now()}`,
      timestamp: new Date(),
      actor: 'system',
    });
  };

  const dispatchMessage = (content: string, actor: 'system' | 'user' = 'system') => {
    dispatch({
      type: 'message',
      payload: { content, actor },
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
      actor,
    });
  };

  const dispatchNavigation = (toTileId: string, toTileName: string, actor: 'system' | 'user' = 'user') => {
    dispatch({
      type: 'navigation',
      payload: { toTileId, toTileName },
      id: `nav-${Date.now()}`,
      timestamp: new Date(),
      actor,
    });
  };

  const dispatchAuthRequired = (reason: string) => {
    dispatch({
      type: 'auth_required',
      payload: { reason },
      id: `auth-required-${Date.now()}`,
      timestamp: new Date(),
      actor: 'system',
    });
  };

  const dispatchError = (error: string, retryable = false) => {
    dispatch({
      type: 'error_occurred',
      payload: { error, retryable },
      id: `error-${Date.now()}`,
      timestamp: new Date(),
      actor: 'system',
    });
  };

  const dispatchUserMessage = (text: string) => {
    dispatch({
      type: 'user_message',
      payload: { text },
      id: `user-msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date(),
      actor: 'user',
    });
  };

  const dispatchCommandExecution = (command: string) => {
    dispatch({
      type: 'execute_command',
      payload: { command },
      id: `cmd-exec-${Date.now()}`,
      timestamp: new Date(),
      actor: 'user',
    });
  };

  return {
    dispatchWidgetResolved,
    dispatchMessage,
    dispatchNavigation,
    dispatchAuthRequired,
    dispatchError,
    dispatchUserMessage,
    dispatchCommandExecution,
  };
}