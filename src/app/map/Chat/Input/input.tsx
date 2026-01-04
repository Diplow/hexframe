'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useChatState } from '~/app/map/Chat/_state';
import {
  useCommandHandling,
  useInputHistory,
  useTextareaController,
  useEventProcessor,
  useAutocompleteLogic,
  useMessageHandling,
  useStreamingTaskExecution,
} from '~/app/map/Chat/Input/_hooks';
import { useChatInputService } from '~/app/map/Chat/Input/_services/chatInputService';
import { loggers } from '~/lib/debug/debug-logger';
import { InputForm } from '~/app/map/Chat/Input/_components/InputForm';
import { useMapCacheCenter } from '~/app/map/Cache';
import { authClient } from '~/lib/auth';
import { useEventBus } from '~/app/map/Services/EventBus';
import { api } from '~/commons/trpc/react';
import { formatDiscussion } from '~/app/map/Chat/_hooks/_discussion-formatter';


export function Input() {
  const [message, setMessage] = useState('');
  const chatState = useChatState();
  const center = useMapCacheCenter();
  const eventBus = useEventBus();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const textareaRefInternal = useRef<HTMLTextAreaElement | null>(null);

  // Fetch user favorites with coordinates for autocomplete and task execution
  const favoritesQuery = api.favorites.listWithPreviews.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const favorites = favoritesQuery.data ?? [];

  // Streaming task execution for @mention handling
  const { executeTask } = useStreamingTaskExecution({ chatState });

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

  // Sync textarea ref
  useEffect(() => {
    textareaRefInternal.current = textareaRef.current;
  }, [textareaRef]);

  // Autocomplete functionality (now includes keyboard handling and favorites)
  const {
    showAutocomplete,
    autocompleteMode,
    selectedSuggestionIndex,
    closeAutocomplete,
    selectCommandSuggestion,
    selectFavoriteSuggestion,
    favoritesSuggestions,
    handleMessageChange: autocompleteHandleMessageChange,
    handleKeyDownWithAutocomplete
  } = useAutocompleteLogic(setMessage, center, handleKeyDown, favorites, textareaRefInternal);

  // Wrap showSystemMessage to avoid unbound method issue
  const showSystemMessage = useCallback(
    (message: string, level?: 'info' | 'warning' | 'error') => {
      chatState.showSystemMessage(message, level);
    },
    [chatState]
  );

  // Get discussion string for USER tile context using shared formatter
  const getDiscussion = useCallback((): string | undefined => {
    return formatDiscussion(chatState.messages);
  }, [chatState.messages]);

  // Message handling with proper resetTextareaHeight and favorites support
  const { handleSend } = useMessageHandling({
    executeCommand,
    sendMessage,
    isCommand,
    validateMessage,
    addToHistory,
    setMessage,
    closeAutocomplete,
    resetTextareaHeight,
    favorites,
    executeTask,
    showSystemMessage,
    getDiscussion,
  });

  const handleMessageChange = (newMessage: string) => {
    autocompleteHandleMessageChange(message, newMessage);
  };

  const commandSuggestions = autocompleteMode === 'command' ? getCommandSuggestions(message) : [];

  return (
    <InputForm
      message={message}
      showAutocomplete={showAutocomplete}
      autocompleteMode={autocompleteMode}
      commandSuggestions={commandSuggestions}
      favoritesSuggestions={favoritesSuggestions}
      selectedSuggestionIndex={selectedSuggestionIndex}
      textareaRef={textareaRef}
      isDisabled={!isAuthenticated}
      onMessageChange={handleMessageChange}
      onKeyDown={(e) => handleKeyDownWithAutocomplete(e, commandSuggestions)}
      onSend={() => handleSend(message)}
      onSelectCommandSuggestion={selectCommandSuggestion}
      onSelectFavoriteSuggestion={selectFavoriteSuggestion}
      onCloseAutocomplete={closeAutocomplete}
    />
  );
}