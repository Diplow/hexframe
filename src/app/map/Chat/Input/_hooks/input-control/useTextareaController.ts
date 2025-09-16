import { useRef, useEffect, useCallback, type KeyboardEvent } from 'react';

interface UseTextareaControllerProps {
  message: string;
  onNavigateHistory: (direction: 'up' | 'down') => string | null;
  onSubmit: () => void;
}

export function useTextareaController({
  message,
  onNavigateHistory,
  onSubmit,
}: UseTextareaControllerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    } else if (e.key === 'ArrowUp' && message === '') {
      e.preventDefault();
      const historyMessage = onNavigateHistory('up');
      if (historyMessage !== null) {
        return historyMessage;
      }
    } else if (e.key === 'ArrowDown' && message === '') {
      e.preventDefault();
      const historyMessage = onNavigateHistory('down');
      if (historyMessage !== null) {
        return historyMessage;
      }
    }
    return null;
  }, [message, onNavigateHistory, onSubmit]);

  const resetTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  return {
    textareaRef,
    handleKeyDown,
    resetTextareaHeight,
  };
}