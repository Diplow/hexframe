import { useCallback } from 'react';

interface UseMessageHandlingProps {
  executeCommand: (command: string) => Promise<string>;
  sendMessage: (message: string) => void;
  isCommand: (message: string) => boolean;
  validateMessage: (message: string) => boolean;
  addToHistory: (message: string) => void;
  setMessage: (message: string) => void;
  closeAutocomplete: () => void;
  resetTextareaHeight: () => void;
}

/**
 * Custom hook for handling message sending logic
 */
export function useMessageHandling({
  executeCommand,
  sendMessage,
  isCommand,
  validateMessage,
  addToHistory,
  setMessage,
  closeAutocomplete,
  resetTextareaHeight
}: UseMessageHandlingProps) {
  
  const handleSend = useCallback((message: string) => {
    if (!validateMessage(message)) return;
    
    const trimmed = message.trim();
    addToHistory(trimmed);
    
    if (isCommand(trimmed)) {
      executeCommand(trimmed).catch((error) => {
        console.error('Failed to execute command:', error);
      });
    } else {
      sendMessage(trimmed);
    }
    
    setMessage('');
    closeAutocomplete();
    resetTextareaHeight();
  }, [
    executeCommand,
    sendMessage,
    isCommand,
    validateMessage,
    addToHistory,
    setMessage,
    closeAutocomplete,
    resetTextareaHeight
  ]);

  return { handleSend };
}