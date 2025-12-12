import { useState, useCallback, useRef } from 'react';

/**
 * Base favorite fields needed for autocomplete.
 * Works with both domain Favorite type and enriched favorites from API.
 */
interface BaseFavorite {
  id: string;
  shortcutName: string;
  mapItemId: number;
}

/**
 * Represents a favorite that matches the current autocomplete query.
 *
 * @property shortcutName - The shortcut name used for @mention matching
 * @property mapItemId - The database ID of the associated map item
 * @property favorite - The full Favorite object for additional context
 */
export interface FavoriteMatch<T extends BaseFavorite = BaseFavorite> {
  shortcutName: string;
  mapItemId: number;
  favorite: T;
}

/**
 * Parameters for the useFavoritesAutocomplete hook.
 *
 * @property favorites - Array of user favorites to search through for autocomplete suggestions
 */
interface UseFavoritesAutocompleteParams<T extends BaseFavorite> {
  favorites: T[];
}

/**
 * Return value of the useFavoritesAutocomplete hook.
 *
 * @property suggestions - Array of favorites matching the current query
 * @property selectedIndex - Index of the currently highlighted suggestion
 * @property isActive - Whether autocomplete is currently showing suggestions
 * @property navigateDown - Move selection to the next suggestion (wraps around)
 * @property navigateUp - Move selection to the previous suggestion (wraps around)
 * @property getSelectedFavorite - Returns the currently selected favorite match or null
 * @property close - Closes the autocomplete and resets state
 * @property updateQuery - Updates suggestions based on a simple query string (e.g., "@plan")
 * @property updateQueryWithCursor - Updates suggestions based on text and cursor position
 */
interface UseFavoritesAutocompleteReturn<T extends BaseFavorite> {
  suggestions: FavoriteMatch<T>[];
  selectedIndex: number;
  isActive: boolean;
  navigateDown: () => void;
  navigateUp: () => void;
  getSelectedFavorite: () => FavoriteMatch<T> | null;
  close: () => void;
  updateQuery: (query: string) => void;
  updateQueryWithCursor: (text: string, cursorPosition: number) => void;
}

/**
 * Extracts the current @mention query from text at the cursor position.
 *
 * Scans backwards from the cursor to find a valid @mention pattern.
 * Handles trailing whitespace between the cursor and mention text.
 * Validates that the @ is preceded by whitespace or is at start of text.
 *
 * @param text - The full input text
 * @param cursorPosition - The current cursor position (character index)
 * @returns The query string (without @) if cursor is in a mention, null otherwise
 *
 * @example
 * // Cursor at end of "@pla" returns "pla"
 * _extractMentionQueryAtCursor('@pla', 4) // "pla"
 *
 * @example
 * // Cursor in middle of text after mention
 * _extractMentionQueryAtCursor('@plan do stuff', 5) // null (cursor past mention)
 */
function _extractMentionQueryAtCursor(
  text: string,
  cursorPosition: number
): string | null {
  // Find the start of the potential mention by looking backwards from cursor
  // Allow trailing whitespace between cursor and mention end
  let mentionStart = -1;
  let mentionEnd = cursorPosition;

  // First, skip any trailing whitespace to find the actual mention end
  for (let i = cursorPosition - 1; i >= 0; i--) {
    const char = text[i];
    if (char && /\s/.test(char)) {
      mentionEnd = i;
      continue;
    }
    break;
  }

  // Now look backwards from mentionEnd to find the @ and validate
  for (let i = mentionEnd - 1; i >= 0; i--) {
    const char = text[i];
    if (char === '@') {
      // Check if @ is preceded by whitespace or start of string (not email)
      if (i === 0 || /\s/.test(text[i - 1] ?? '')) {
        mentionStart = i;
      }
      break;
    }
    // If we hit a non-alphanumeric/underscore before @, no mention
    if (char && !/[a-zA-Z0-9_]/.test(char)) {
      break;
    }
  }

  if (mentionStart === -1) {
    return null;
  }

  // Extract the query (everything after @ up to mentionEnd, not cursor)
  const queryText = text.slice(mentionStart + 1, mentionEnd);

  // Validate the query contains only valid chars
  if (!/^[a-zA-Z0-9_]*$/.test(queryText)) {
    return null;
  }

  return queryText;
}

/**
 * Filters favorites by case-insensitive prefix match on shortcut names.
 *
 * @param favorites - Array of favorites to filter
 * @param prefix - The prefix to match against (without the @ symbol)
 * @returns Array of FavoriteMatch objects for matching favorites
 */
function _filterFavoritesByPrefix<T extends BaseFavorite>(
  favorites: T[],
  prefix: string
): FavoriteMatch<T>[] {
  const lowerPrefix = prefix.toLowerCase();
  return favorites
    .filter((favorite) =>
      favorite.shortcutName.toLowerCase().startsWith(lowerPrefix)
    )
    .map((favorite) => ({
      shortcutName: favorite.shortcutName,
      mapItemId: favorite.mapItemId,
      favorite,
    }));
}

/**
 * React hook for managing favorites autocomplete state and keyboard navigation.
 *
 * Provides functionality for:
 * - Filtering favorites based on @mention queries
 * - Keyboard navigation through suggestions (up/down arrow keys)
 * - Cursor-aware autocomplete that detects @mentions mid-text
 *
 * @param params - Configuration options including the favorites list to search
 * @returns Object with suggestions, navigation functions, and state
 *
 * @example
 * const {
 *   suggestions,
 *   isActive,
 *   updateQueryWithCursor,
 *   navigateDown,
 *   getSelectedFavorite,
 * } = useFavoritesAutocomplete({ favorites });
 *
 * // On input change
 * updateQueryWithCursor(inputValue, cursorPosition);
 *
 * // On arrow key press
 * if (event.key === 'ArrowDown') navigateDown();
 *
 * // On enter/tab to select
 * const selected = getSelectedFavorite();
 */
export function useFavoritesAutocomplete<T extends BaseFavorite>({
  favorites,
}: UseFavoritesAutocompleteParams<T>): UseFavoritesAutocompleteReturn<T> {
  const [suggestions, setSuggestions] = useState<FavoriteMatch<T>[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  // Ref tracks suggestions for navigation callbacks (ensures latest value in same act() block)
  const suggestionsRef = useRef<FavoriteMatch<T>[]>([]);

  const resetState = useCallback(() => {
    setIsActive(false);
    setSuggestions([]);
    suggestionsRef.current = [];
    setSelectedIndex(0);
  }, []);

  const activateWithMatches = useCallback((matches: FavoriteMatch<T>[]) => {
    setIsActive(true);
    setSuggestions(matches);
    suggestionsRef.current = matches;
    setSelectedIndex(0);
  }, []);

  const navigateDown = useCallback(() => {
    const currentSuggestions = suggestionsRef.current;
    setSelectedIndex((i) =>
      currentSuggestions.length === 0 ? 0 : i < currentSuggestions.length - 1 ? i + 1 : 0
    );
  }, []);

  const navigateUp = useCallback(() => {
    const currentSuggestions = suggestionsRef.current;
    setSelectedIndex((i) =>
      currentSuggestions.length === 0 ? 0 : i > 0 ? i - 1 : currentSuggestions.length - 1
    );
  }, []);

  const getSelectedFavorite = useCallback((): FavoriteMatch<T> | null => {
    const currentSuggestions = suggestionsRef.current;
    return selectedIndex >= 0 && selectedIndex < currentSuggestions.length
      ? currentSuggestions[selectedIndex] ?? null
      : null;
  }, [selectedIndex]);

  const updateQuery = useCallback(
    (query: string) => {
      if (!query.startsWith('@')) return resetState();
      activateWithMatches(_filterFavoritesByPrefix(favorites, query.slice(1)));
    },
    [favorites, resetState, activateWithMatches]
  );

  const updateQueryWithCursor = useCallback(
    (text: string, cursorPosition: number) => {
      const mentionQuery = _extractMentionQueryAtCursor(text, cursorPosition);
      if (mentionQuery === null) return resetState();
      activateWithMatches(_filterFavoritesByPrefix(favorites, mentionQuery));
    },
    [favorites, resetState, activateWithMatches]
  );

  return {
    suggestions, selectedIndex, isActive, navigateDown, navigateUp,
    getSelectedFavorite, close: resetState, updateQuery, updateQueryWithCursor,
  };
}
