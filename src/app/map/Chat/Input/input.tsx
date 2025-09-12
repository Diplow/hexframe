'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { useChatState } from '~/app/map/Chat/_state';
import { useCommandHandling } from '~/app/map/Chat/Input/_hooks/useCommandHandling';
import { useInputHistory } from '~/app/map/Chat/Input/_hooks/useInputHistory';
import { useTextareaController } from '~/app/map/Chat/Input/_hooks/useTextareaController';
import { useChatInputService } from '~/app/map/Chat/Input/_services/chatInputService';
import { loggers } from '~/lib/debug/debug-logger';
import { CommandAutocomplete } from '~/app/map/Chat/Input/_components/CommandAutocomplete';
import { getAllCommands } from '~/app/map/Chat/Input/_commands';
import { useMapCache } from '~/app/map/Cache';

/**
 * Custom hook for processing command events
 */
function useEventProcessor(events: any[], executeCommand: (command: string) => Promise<string>) {
  const lastProcessedCommandRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!events || !Array.isArray(events)) return;
    
    const unprocessedEvents = events.filter(e => 
      e.type === 'execute_command' && 
      e.timestamp.getTime() > (lastProcessedCommandRef.current ? new Date(lastProcessedCommandRef.current).getTime() : 0)
    ) as Array<{ type: 'execute_command'; payload: { command: string }; timestamp: Date }>;
    
    if (unprocessedEvents.length > 0) {
      const latestEvent = unprocessedEvents[unprocessedEvents.length - 1];
      if (!latestEvent) return;
      
      const command = latestEvent.payload.command;
      lastProcessedCommandRef.current = latestEvent.timestamp.toISOString();
      void executeCommand(command);
    }
  }, [events, executeCommand]);
}

/**
 * Custom hook for autocomplete logic
 */
function useAutocompleteLogic(setMessage: (msg: string) => void, center: string | null) {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  
  const closeAutocomplete = useCallback(() => {
    setShowAutocomplete(false);
    setSelectedSuggestionIndex(0);
  }, []);
  
  const selectSuggestion = useCallback((command: string) => {
    const allCommands = getAllCommands(center);
    const commandKeys = Object.keys(allCommands);
    const hasSubcommands = commandKeys.some(cmd => 
      cmd.startsWith(command + '/') && cmd !== command
    );
    
    if (hasSubcommands) {
      const newMessage = command + '/';
      setMessage(newMessage);
      setSelectedSuggestionIndex(0);
    } else {
      setMessage(command);
      closeAutocomplete();
    }
  }, [setMessage, center, closeAutocomplete]);
  
  const handleMessageChange = useCallback((message: string, newMessage: string) => {
    setMessage(newMessage);
    
    if ((message === '' && newMessage === '/') || 
        (newMessage.startsWith('/') && newMessage.endsWith('/') && newMessage !== '/')) {
      setShowAutocomplete(true);
      setSelectedSuggestionIndex(0);
    } else if (!newMessage.startsWith('/')) {
      closeAutocomplete();
    }
  }, [setMessage, closeAutocomplete]);
  
  return {
    showAutocomplete,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    closeAutocomplete,
    selectSuggestion,
    handleMessageChange
  };
}

/**
 * Custom hook for keyboard handling with autocomplete
 */
function useKeyboardHandling(
  showAutocomplete: boolean,
  suggestions: any[],
  selectedSuggestionIndex: number,
  setSelectedSuggestionIndex: (fn: (prev: number) => number) => void,
  selectSuggestion: (cmd: string) => void,
  handleSend: () => void,
  textareaHandleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => string | null,
  setMessage: (msg: string) => void
) {
  return useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showAutocomplete && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
        return;
      }
      
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        const selectedSuggestion = suggestions[selectedSuggestionIndex];
        if (selectedSuggestion) {
          selectSuggestion(selectedSuggestion.command);
        }
        return;
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        setMessage('');
        return;
      }
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    const historyMessage = textareaHandleKeyDown(e);
    if (historyMessage !== null) {
      setMessage(historyMessage);
    }
  }, [showAutocomplete, suggestions, selectedSuggestionIndex, setSelectedSuggestionIndex, selectSuggestion, handleSend, textareaHandleKeyDown, setMessage]);
}

export function Input() {
  const [message, setMessage] = useState('');
  const chatState = useChatState();
  const events = chatState.events;
  const { center } = useMapCache();
  
  // Debug logging for Input component renders
  useEffect(() => {
    loggers.render.chat('Input component mounted');
    return () => {
      loggers.render.chat('Input component unmounted');
    };
  }, []);
  
  useEffect(() => {
    loggers.render.chat('Input component rendered', {
      messageLength: message.length,
      hasMessage: !!message
    });
  });
  
  const { executeCommand, getCommandSuggestions } = useCommandHandling();
  const { addToHistory, navigateHistory } = useInputHistory();
  const { sendMessage, isCommand, validateMessage } = useChatInputService();
  
  // Use extracted hooks
  useEventProcessor(events, executeCommand);
  
  const {
    showAutocomplete,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    closeAutocomplete,
    selectSuggestion,
    handleMessageChange: autocompleteHandleMessageChange
  } = useAutocompleteLogic(setMessage, center);
  
  // Get command suggestions only when autocomplete is showing
  const suggestions = showAutocomplete ? getCommandSuggestions(message) : [];

  const handleMessageChange = (newMessage: string) => {
    autocompleteHandleMessageChange(message, newMessage);
  };
  
  const { textareaRef, handleKeyDown, resetTextareaHeight } = useTextareaController({
    message,
    onNavigateHistory: (direction) => {
      const historyMessage = navigateHistory(direction);
      if (historyMessage !== null) {
        setMessage(historyMessage);
      }
      return historyMessage;
    },
    onSubmit: handleSend,
  });

  function handleSend() {
    if (!validateMessage(message)) return;
    
    const trimmed = message.trim();
    addToHistory(trimmed);
    
    if (isCommand(trimmed)) {
      executeCommand(trimmed);
    } else {
      sendMessage(trimmed);
    }
    
    setMessage('');
    closeAutocomplete(); // Close autocomplete when sending message
    resetTextareaHeight();
  }
  
  function handleKeyDownWithHistory(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Handle autocomplete navigation
    if (showAutocomplete && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      }
      
      if (e.key === 'Tab' || e.key === 'Enter') {
        if (selectedSuggestionIndex < suggestions.length) {
          e.preventDefault();
          selectSuggestion(suggestions[selectedSuggestionIndex]?.command ?? '');
          return;
        }
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAutocomplete();
        return;
      }
    }

    const historyMessage = handleKeyDown(e);
    if (historyMessage !== null) {
      setMessage(historyMessage);
    }
  }
  
  

  return (
    <div className="relative">
      {showAutocomplete && (
        <CommandAutocomplete
          suggestions={suggestions}
          selectedIndex={selectedSuggestionIndex}
          onSelect={selectSuggestion}
          _onClose={closeAutocomplete}
          inputRef={textareaRef}
        />
      )}
      <div className="flex items-end gap-2 p-4 border-t border-[color:var(--stroke-color-950)]">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => handleMessageChange(e.target.value)}
          onKeyDown={handleKeyDownWithHistory}
          placeholder="Type a message..."
          className="flex-1 resize-none rounded-lg px-3 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[40px] max-h-[120px]"
          rows={1}
          data-testid="chat-input"
          data-chat-input
        />
        <Button
        onClick={handleSend}
        disabled={!message.trim()}
        size="sm"
        className="h-10 w-10 p-0"
        data-testid="send-button"
      >
        <Send className="h-4 w-4" />
      </Button>
      </div>
    </div>
  );
}