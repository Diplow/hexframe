'use client';

import { useState, useEffect } from 'react';
// import { Send } from 'lucide-react';
// import { Button } from '~/components/ui/button';
import { useChatState } from '~/app/map/Chat/_state';
import { useCommandHandling } from '~/app/map/Chat/Input/_hooks/commands/useCommandHandling';
import { useInputHistory } from '~/app/map/Chat/Input/_hooks/input-control/useInputHistory';
import { useTextareaController } from '~/app/map/Chat/Input/_hooks/input-control/useTextareaController';
import { useChatInputService } from '~/app/map/Chat/Input/_services/chatInputService';
import { useEventProcessor } from '~/app/map/Chat/Input/_hooks/messages/useEventProcessor';
import { useAutocompleteLogic } from '~/app/map/Chat/Input/_hooks/autocomplete/useAutocompleteLogic';
import { useMessageHandling } from '~/app/map/Chat/Input/_hooks/messages/useMessageHandling';
import { loggers } from '~/lib/debug/debug-logger';
import { InputForm } from '~/app/map/Chat/Input/_components/InputForm';
import { useMapCacheCenter } from '~/app/map/Cache';
import { authClient } from '~/lib/auth';
import { useEventBus } from '~/app/map/Services/EventBus';;


export function Input() {
  const [message, setMessage] = useState('');
  const chatState = useChatState();
  const center = useMapCacheCenter();
  const eventBus = useEventBus();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Track authentication state via EventBus
  useEffect(() => {
    // Get initial auth state
    void authClient.getSession().then(session => {
      setIsAuthenticated(!!session?.data?.user);
    });

    // Subscribe to auth events
    const unsubscribe = eventBus.on('auth.*', (event) => {
      if (event.type === 'auth.login') {
        setIsAuthenticated(true);
      }
      if (event.type === 'auth.logout') {
        setIsAuthenticated(false);
      }
    });

    return unsubscribe;
  }, [eventBus]);

  // Show login widget when user is not logged in
  useEffect(() => {
    if (!isAuthenticated) {
      eventBus.emit({
        type: 'auth.required',
        payload: {
          reason: 'Please log in to use the chat'
        },
        source: 'chat_cache',
        timestamp: new Date()
      });
    }
  }, [isAuthenticated, eventBus]);
  
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
    setSelectedSuggestionIndex: _setSelectedSuggestionIndex, // eslint-disable-line @typescript-eslint/no-unused-vars
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
      isDisabled={!isAuthenticated}
      onMessageChange={handleMessageChange}
      onKeyDown={(e) => handleKeyDownWithAutocomplete(e, suggestions)}
      onSend={() => handleSend(message)}
      onSelectSuggestion={selectSuggestion}
      onCloseAutocomplete={closeAutocomplete}
    />
  );
}