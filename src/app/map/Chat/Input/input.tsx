'use client';

import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { useChatState } from '~/app/map/Chat/_state';
import { useCommandHandling } from '~/app/map/Chat/Input/_hooks/useCommandHandling';
import { useInputHistory } from '~/app/map/Chat/Input/_hooks/useInputHistory';
import { useTextareaController } from '~/app/map/Chat/Input/_hooks/useTextareaController';
import { useChatInputService } from '~/app/map/Chat/Input/_services/chatInputService';
import { useEventProcessor } from '~/app/map/Chat/Input/_hooks/useEventProcessor';
import { useAutocompleteLogic } from '~/app/map/Chat/Input/_hooks/useAutocompleteLogic';
import { useMessageHandling } from '~/app/map/Chat/Input/_hooks/useMessageHandling';
import { loggers } from '~/lib/debug/debug-logger';
import { InputForm } from '~/app/map/Chat/Input/_components/InputForm';
import { useMapCache } from '~/app/map/Cache';


export function Input() {
  const [message, setMessage] = useState('');
  const chatState = useChatState();
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
  
  // Core functionality hooks
  const { executeCommand, getCommandSuggestions } = useCommandHandling();
  const { addToHistory, navigateHistory } = useInputHistory();
  const { sendMessage, isCommand, validateMessage } = useChatInputService();
  
  // Event processing
  useEventProcessor(chatState.events, executeCommand);
  
  // Textarea controller
  const { textareaRef, handleKeyDown, resetTextareaHeight } = useTextareaController({
    message,
    onNavigateHistory: (direction) => {
      const historyMessage = navigateHistory(direction);
      if (historyMessage !== null) {
        setMessage(historyMessage);
      }
      return historyMessage;
    },
    onSubmit: () => handleSend(message),
  });
  
  // Autocomplete functionality (now includes keyboard handling)
  const {
    showAutocomplete,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    closeAutocomplete,
    selectSuggestion,
    handleMessageChange: autocompleteHandleMessageChange,
    handleKeyDownWithAutocomplete
  } = useAutocompleteLogic(setMessage, center, handleKeyDown);
  
  // Message handling with proper resetTextareaHeight
  const { handleSend } = useMessageHandling({
    executeCommand,
    sendMessage,
    isCommand,
    validateMessage,
    addToHistory,
    setMessage,
    closeAutocomplete,
    resetTextareaHeight
  });
  
  const handleMessageChange = (newMessage: string) => {
    autocompleteHandleMessageChange(message, newMessage);
  };
  
  const suggestions = showAutocomplete ? getCommandSuggestions(message) : [];

  return (
    <InputForm
      message={message}
      showAutocomplete={showAutocomplete}
      suggestions={suggestions}
      selectedSuggestionIndex={selectedSuggestionIndex}
      textareaRef={textareaRef}
      onMessageChange={handleMessageChange}
      onKeyDown={(e) => handleKeyDownWithAutocomplete(e, suggestions)}
      onSend={() => handleSend(message)}
      onSelectSuggestion={selectSuggestion}
      onCloseAutocomplete={closeAutocomplete}
    />
  );
}