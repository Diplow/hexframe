import { useState, useCallback } from 'react';
import { getAllCommands } from '~/app/map/Chat/Input/_commands';

interface CommandSuggestion {
  command: string;
  description: string;
  isExact?: boolean;
}

/**
 * Handle autocomplete arrow navigation
 */
function _handleArrowNavigation(
  e: React.KeyboardEvent,
  selectedIndex: number,
  suggestionsLength: number,
  setSelectedIndex: (index: number) => void
): boolean {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setSelectedIndex(selectedIndex < suggestionsLength - 1 ? selectedIndex + 1 : 0);
    return true;
  }
  
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : suggestionsLength - 1);
    return true;
  }
  
  return false;
}

/**
 * Handle autocomplete command selection
 */
function _handleCommandSelection(
  e: React.KeyboardEvent,
  selectedIndex: number,
  suggestions: CommandSuggestion[],
  selectSuggestion: (command: string) => void
): boolean {
  if (e.key === 'Tab' || e.key === 'Enter') {
    if (selectedIndex < suggestions.length) {
      e.preventDefault();
      const selectedSuggestion = suggestions[selectedIndex];
      if (selectedSuggestion) {
        selectSuggestion(selectedSuggestion.command);
      }
      return true;
    }
  }
  
  return false;
}

/**
 * Handle autocomplete escape key
 */
function _handleAutocompleteEscape(
  e: React.KeyboardEvent,
  closeAutocomplete: () => void
): boolean {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeAutocomplete();
    return true;
  }
  
  return false;
}

/**
 * Create autocomplete selection logic
 */
function _createSuggestionSelector(setMessage: (msg: string) => void, center: string | null, closeAutocomplete: () => void) {
  return useCallback((command: string) => {
    const allCommands = getAllCommands(center);
    const commandKeys = Object.keys(allCommands);
    const hasSubcommands = commandKeys.some(cmd => 
      cmd.startsWith(command + '/') && cmd !== command
    );
    
    if (hasSubcommands) {
      const newMessage = command + '/';
      setMessage(newMessage);
    } else {
      setMessage(command);
      closeAutocomplete();
    }
  }, [setMessage, center, closeAutocomplete]);
}

/**
 * Create message change handler for autocomplete triggering
 */
function _createMessageChangeHandler(setMessage: (msg: string) => void, setShowAutocomplete: (show: boolean) => void, setSelectedIndex: (index: number) => void, closeAutocomplete: () => void) {
  return useCallback((message: string, newMessage: string) => {
    setMessage(newMessage);
    
    if ((message === '' && newMessage === '/') || 
        (newMessage.startsWith('/') && newMessage.endsWith('/') && newMessage !== '/')) {
      setShowAutocomplete(true);
      setSelectedIndex(0);
    } else if (!newMessage.startsWith('/')) {
      closeAutocomplete();
    }
  }, [setMessage, setShowAutocomplete, setSelectedIndex, closeAutocomplete]);
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
  
  const selectSuggestion = _createSuggestionSelector(setMessage, center, closeAutocomplete);
  const handleMessageChange = _createMessageChangeHandler(setMessage, setShowAutocomplete, setSelectedSuggestionIndex, closeAutocomplete);
  
  const handleKeyDownWithAutocomplete = useCallback((
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    suggestions: CommandSuggestion[]
  ) => {
    // Handle autocomplete navigation when active
    if (showAutocomplete && suggestions.length > 0) {
      if (_handleArrowNavigation(e, selectedSuggestionIndex, suggestions.length, setSelectedSuggestionIndex)) return;
      if (_handleCommandSelection(e, selectedSuggestionIndex, suggestions, selectSuggestion)) return;
      if (_handleAutocompleteEscape(e, closeAutocomplete)) return;
    }

    // Delegate to history navigation handler
    const historyMessage = handleKeyDown(e);
    if (historyMessage !== null) {
      setMessage(historyMessage);
    }
  }, [showAutocomplete, selectedSuggestionIndex, selectSuggestion, closeAutocomplete, handleKeyDown, setMessage]);
  
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