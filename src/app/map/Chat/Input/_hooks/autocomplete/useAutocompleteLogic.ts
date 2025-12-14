import { useState, useCallback, useRef } from 'react';
import { getAllCommands } from '~/app/map/Chat/Input/_commands';
import type { Favorite } from '~/lib/domains/iam';
import type { FavoriteMatch } from '~/app/map/Chat/Input/_hooks/autocomplete/use-favorites-autocomplete';
import {
  extractMentionQueryAtCursor,
  filterFavoritesByPrefix,
  findMentionStartPosition,
} from '~/app/map/Chat/Input/_hooks/autocomplete/_favorites-helpers';

interface CommandSuggestion {
  command: string;
  description: string;
  isExact?: boolean;
}

type AutocompleteMode = 'none' | 'command' | 'favorites';

/**
 * Handle autocomplete keyboard navigation (arrows, selection, escape)
 */
function _handleAutocompleteKeyboard(
  e: React.KeyboardEvent,
  selectedIndex: number,
  suggestionsLength: number,
  setSelectedIndex: (index: number) => void,
  onSelect: () => void,
  closeAutocomplete: () => void
): boolean {
  // Arrow navigation
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
  // Selection
  if (e.key === 'Tab' || e.key === 'Enter') {
    if (selectedIndex < suggestionsLength) {
      e.preventDefault();
      onSelect();
      return true;
    }
  }
  // Escape
  if (e.key === 'Escape') {
    e.preventDefault();
    closeAutocomplete();
    return true;
  }
  return false;
}

/**
 * Create autocomplete selection logic for commands
 */
function _createCommandSelector(
  setMessage: (msg: string) => void,
  center: string | null,
  closeAutocomplete: () => void
) {
  return (command: string) => {
    const allCommands = getAllCommands(center);
    const commandKeys = Object.keys(allCommands);
    const hasSubcommands = commandKeys.some(cmd =>
      cmd.startsWith(command + '/') && cmd !== command
    );
    if (hasSubcommands) {
      setMessage(command + '/');
    } else {
      setMessage(command);
      closeAutocomplete();
    }
  };
}

/**
 * Create message change handler for autocomplete triggering
 */
function _createMessageChangeHandler(
  setMessage: (msg: string) => void,
  setMode: (mode: AutocompleteMode) => void,
  setSelectedIndex: (index: number) => void,
  closeAutocomplete: () => void,
  favorites: Favorite[],
  setFavoritesSuggestions: (suggestions: FavoriteMatch[]) => void,
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
) {
  return (message: string, newMessage: string) => {
    setMessage(newMessage);

    // Check for command autocomplete (/)
    if ((message === '' && newMessage === '/') ||
        (newMessage.startsWith('/') && newMessage.endsWith('/') && newMessage !== '/')) {
      setMode('command');
      setSelectedIndex(0);
      return;
    }

    // Check for favorites autocomplete (@)
    const cursorPosition = textareaRef.current?.selectionStart ?? newMessage.length;
    const mentionQuery = extractMentionQueryAtCursor(newMessage, cursorPosition);

    if (mentionQuery !== null) {
      const matches = filterFavoritesByPrefix(favorites, mentionQuery);
      if (matches.length > 0) {
        setFavoritesSuggestions(matches);
        setMode('favorites');
        setSelectedIndex(0);
        return;
      }
    }

    // Close if not starting with / or no active @ mention
    if (!newMessage.startsWith('/')) {
      closeAutocomplete();
    }
  };
}

/**
 * Combined hook for autocomplete logic, state management, and keyboard handling
 */
export function useAutocompleteLogic(
  setMessage: (msg: string) => void,
  center: string | null,
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => string | null,
  favorites: Favorite[] = [],
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
) {
  const [autocompleteMode, setAutocompleteMode] = useState<AutocompleteMode>('none');
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [favoritesSuggestions, setFavoritesSuggestions] = useState<FavoriteMatch[]>([]);
  // Keep a ref to favorites suggestions for keyboard handlers
  const favoritesSuggestionsRef = useRef<FavoriteMatch[]>([]);
  favoritesSuggestionsRef.current = favoritesSuggestions;

  const showAutocomplete = autocompleteMode !== 'none';

  const closeAutocomplete = useCallback(() => {
    setAutocompleteMode('none');
    setSelectedSuggestionIndex(0);
    setFavoritesSuggestions([]);
  }, []);

  const selectCommandSuggestion = _createCommandSelector(setMessage, center, closeAutocomplete);

  const selectFavoriteSuggestion = useCallback((shortcutName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMessage(`@${shortcutName} `);
      closeAutocomplete();
      return;
    }

    const currentValue = textarea.value;
    const cursorPosition = textarea.selectionStart ?? currentValue.length;
    const mentionStart = findMentionStartPosition(currentValue, cursorPosition);

    if (mentionStart === -1) {
      setMessage(`@${shortcutName} `);
    } else {
      const before = currentValue.slice(0, mentionStart);
      const after = currentValue.slice(cursorPosition);
      setMessage(`${before}@${shortcutName} ${after}`);
    }
    closeAutocomplete();
  }, [setMessage, closeAutocomplete, textareaRef]);

  const handleMessageChange = useCallback((message: string, newMessage: string) => {
    const handler = _createMessageChangeHandler(
      setMessage, setAutocompleteMode, setSelectedSuggestionIndex,
      closeAutocomplete, favorites, setFavoritesSuggestions, textareaRef
    );
    handler(message, newMessage);
  }, [setMessage, closeAutocomplete, favorites, textareaRef]);

  const handleKeyDownWithAutocomplete = useCallback((
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    commandSuggestions: CommandSuggestion[]
  ) => {
    // Handle command autocomplete
    if (autocompleteMode === 'command' && commandSuggestions.length > 0) {
      const selected = commandSuggestions[selectedSuggestionIndex];
      const handled = _handleAutocompleteKeyboard(
        e, selectedSuggestionIndex, commandSuggestions.length, setSelectedSuggestionIndex,
        () => selected && selectCommandSuggestion(selected.command),
        closeAutocomplete
      );
      if (handled) return;
    }

    // Handle favorites autocomplete
    if (autocompleteMode === 'favorites' && favoritesSuggestionsRef.current.length > 0) {
      const selected = favoritesSuggestionsRef.current[selectedSuggestionIndex];
      const handled = _handleAutocompleteKeyboard(
        e, selectedSuggestionIndex, favoritesSuggestionsRef.current.length, setSelectedSuggestionIndex,
        () => selected && selectFavoriteSuggestion(selected.shortcutName),
        closeAutocomplete
      );
      if (handled) return;
    }

    // Delegate to history navigation handler
    const historyMessage = handleKeyDown(e);
    if (historyMessage !== null) {
      setMessage(historyMessage);
    }
  }, [autocompleteMode, selectedSuggestionIndex, selectCommandSuggestion, selectFavoriteSuggestion, closeAutocomplete, handleKeyDown, setMessage]);

  return {
    showAutocomplete,
    autocompleteMode,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    closeAutocomplete,
    selectCommandSuggestion,
    selectFavoriteSuggestion,
    favoritesSuggestions,
    handleMessageChange,
    handleKeyDownWithAutocomplete
  };
}