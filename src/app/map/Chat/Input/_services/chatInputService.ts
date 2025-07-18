import { useChatState } from '../../_state';

export function useChatInputService() {
  const chatState = useChatState();

  const sendMessage = (message: string) => {
    chatState.sendMessage(message);
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