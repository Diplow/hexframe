'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '~/components/ui/button';
import useChatState from '../_state/useChatState';
import { useCommandHandling } from './_hooks/useCommandHandling';
import { useInputHistory } from './_hooks/useInputHistory';
import { useTextareaController } from './_hooks/useTextareaController';
import { useChatInputService } from './_services/chatInputService';
import { loggers } from '~/lib/debug/debug-logger';
import { CommandAutocomplete } from './_components/CommandAutocomplete';

export function Input() {
  const [message, setMessage] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const lastProcessedCommandRef = useRef<string | null>(null);
  const chatState = useChatState();
  const { events } = chatState;
  
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
  
  const { executeCommand, executeCommandFromPayload, getCommandSuggestions, getAllCommands } = useCommandHandling();
  const { addToHistory, navigateHistory } = useInputHistory();
  const { sendMessage, isCommand, validateMessage } = useChatInputService();
  
  // Get command suggestions only when autocomplete is showing
  const suggestions = showAutocomplete ? getCommandSuggestions(message) : [];

  const closeAutocomplete = () => {
    setShowAutocomplete(false);
    setSelectedSuggestionIndex(0);
  };

  const selectSuggestion = (command: string) => {
    // Check if this command has subcommands
    const allCommands = getAllCommands();
    const hasSubcommands = allCommands.some(cmd => 
      cmd.startsWith(command + '/') && cmd !== command
    );
    
    if (hasSubcommands) {
      // If it has subcommands, add a trailing slash and keep autocomplete open
      const newMessage = command + '/';
      setMessage(newMessage);
      // Don't close autocomplete - it will update with new suggestions
    } else {
      // If no subcommands, close autocomplete
      setMessage(command);
      closeAutocomplete();
    }
    
    textareaRef.current?.focus();
  };

  const handleMessageChange = (newMessage: string) => {
    setMessage(newMessage);
    
    // Open autocomplete when user types "/" in empty input OR adds "/" to a command
    if ((message === '' && newMessage === '/') || 
        (newMessage.startsWith('/') && newMessage.endsWith('/') && newMessage !== '/')) {
      setShowAutocomplete(true);
      setSelectedSuggestionIndex(0);
    }
    // Close autocomplete when message no longer starts with "/"
    else if (!newMessage.startsWith('/')) {
      setShowAutocomplete(false);
    }
    // Keep autocomplete open if it's already open and message still starts with "/"
    else if (showAutocomplete && newMessage.startsWith('/')) {
      // Autocomplete will update automatically due to suggestions changing
    }
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
  
  useEffect(() => {
    const unprocessedEvents = events.filter(e => 
      e.type === 'execute_command' && 
      e.timestamp.getTime() > (lastProcessedCommandRef.current ? new Date(lastProcessedCommandRef.current).getTime() : 0)
    ) as Array<{ type: 'execute_command'; payload: { command: string }; timestamp: Date }>;
    
    if (unprocessedEvents.length > 0) {
      const latestEvent = unprocessedEvents[unprocessedEvents.length - 1];
      if (!latestEvent) return;
      
      const payload = latestEvent.payload;
      lastProcessedCommandRef.current = latestEvent.timestamp.toISOString();
      void executeCommandFromPayload(payload);
    }
  }, [events, executeCommandFromPayload]);
  

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