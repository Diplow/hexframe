import { useChatCacheOperations } from '../../_cache/hooks/useChatCacheOperations';

export function useChatInputService() {
  const { dispatch } = useChatCacheOperations();

  const sendMessage = (message: string) => {
    dispatch({
      type: 'user_message',
      payload: {
        text: message,
      },
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date(),
      actor: 'user',
    });
  };

  const isCommand = (message: string): boolean => {
    return message.startsWith('/');
  };

  const validateMessage = (message: string): boolean => {
    return message.trim().length > 0;
  };

  return {
    sendMessage,
    isCommand,
    validateMessage,
  };
}