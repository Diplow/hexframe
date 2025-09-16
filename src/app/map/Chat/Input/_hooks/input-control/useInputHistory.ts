import { useState, useCallback } from 'react';

const HISTORY_KEY = 'hexframe-chat-history';
const MAX_HISTORY = 50;

export function useInputHistory() {
  const [messageHistory, setMessageHistory] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) as string[] : [];
    } catch {
      return [];
    }
  });
  
  const [historyIndex, setHistoryIndex] = useState(-1);

  const addToHistory = useCallback((message: string) => {
    setMessageHistory(prev => {
      const newHistory = [...prev, message];
      const trimmedHistory = newHistory.slice(-MAX_HISTORY);
      
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
      } catch (e) {
        console.error('Failed to save message history:', e);
      }
      
      return trimmedHistory;
    });
    setHistoryIndex(-1);
  }, []);

  const navigateHistory = useCallback((direction: 'up' | 'down') => {
    if (direction === 'up') {
      if (messageHistory.length > 0) {
        const newIndex = historyIndex === -1 
          ? messageHistory.length - 1 
          : Math.max(0, historyIndex - 1);
        
        setHistoryIndex(newIndex);
        return messageHistory[newIndex] ?? '';
      }
    } else if (direction === 'down') {
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        
        if (newIndex >= messageHistory.length) {
          setHistoryIndex(-1);
          return '';
        } else {
          setHistoryIndex(newIndex);
          return messageHistory[newIndex] ?? '';
        }
      }
    }
    return null;
  }, [messageHistory, historyIndex]);

  return {
    addToHistory,
    navigateHistory,
  };
}