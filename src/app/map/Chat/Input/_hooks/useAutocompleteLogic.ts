import { useState, useCallback } from 'react';
import { getAllCommands } from '~/app/map/Chat/Input/_commands';

interface CommandSuggestion {
  command: string;
  description: string;
  isExact?: boolean;
}

/**
 * Combined hook for autocomplete logic, state management, and keyboard handling
 */
export function useAutocompleteLogic(
  setMessage: (msg: string) => void, 
  center: string | null,
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => string | null
) {
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
  
  const handleKeyDownWithAutocomplete = useCallback((
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    suggestions: CommandSuggestion[]
  ) => {
    // Handle autocomplete navigation
    if (showAutocomplete && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(
          selectedSuggestionIndex < suggestions.length - 1 ? selectedSuggestionIndex + 1 : 0
        );
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(
          selectedSuggestionIndex > 0 ? selectedSuggestionIndex - 1 : suggestions.length - 1
        );
        return;
      }
      
      if (e.key === 'Tab' || e.key === 'Enter') {
        if (selectedSuggestionIndex < suggestions.length) {
          e.preventDefault();
          const selectedSuggestion = suggestions[selectedSuggestionIndex];
          if (selectedSuggestion) {
            selectSuggestion(selectedSuggestion.command);
          }
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
  }, [
    showAutocomplete,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    selectSuggestion,
    closeAutocomplete,
    handleKeyDown,
    setMessage
  ]);
  
  return {
    showAutocomplete,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    closeAutocomplete,
    selectSuggestion,
    handleMessageChange,
    handleKeyDownWithAutocomplete
  };
}