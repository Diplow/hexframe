import type { Favorite } from '~/lib/domains/iam/_repositories';
import type { FavoriteMatch } from '~/app/map/Chat/Input/_hooks/autocomplete/use-favorites-autocomplete';

/**
 * Extracts the current @mention query from text at the cursor position.
 * Scans backwards from the cursor to find a valid @mention pattern.
 *
 * @param text - The full input text
 * @param cursorPosition - The current cursor position (character index)
 * @returns The query string (without @) if cursor is in a mention, null otherwise
 */
export function extractMentionQueryAtCursor(
  text: string,
  cursorPosition: number
): string | null {
  let mentionStart = -1;
  let mentionEnd = cursorPosition;

  // Skip any trailing whitespace to find the actual mention end
  for (let i = cursorPosition - 1; i >= 0; i--) {
    const char = text[i];
    if (char && /\s/.test(char)) {
      mentionEnd = i;
      continue;
    }
    break;
  }

  // Look backwards from mentionEnd to find the @ and validate
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

  const queryText = text.slice(mentionStart + 1, mentionEnd);
  if (!/^[a-zA-Z0-9_]*$/.test(queryText)) {
    return null;
  }

  return queryText;
}

/**
 * Filter favorites by case-insensitive prefix match on shortcut names.
 *
 * @param favorites - Array of favorites to filter
 * @param prefix - The prefix to match against (without the @ symbol)
 * @returns Array of FavoriteMatch objects for matching favorites
 */
export function filterFavoritesByPrefix(
  favorites: Favorite[],
  prefix: string
): FavoriteMatch[] {
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
 * Find the start position of an @mention in text working backwards from cursor
 *
 * @param text - The input text
 * @param cursorPosition - Current cursor position
 * @returns The index where @ starts, or -1 if not found
 */
export function findMentionStartPosition(
  text: string,
  cursorPosition: number
): number {
  for (let i = cursorPosition - 1; i >= 0; i--) {
    if (text[i] === '@') {
      if (i === 0 || /\s/.test(text[i - 1] ?? '')) {
        return i;
      }
      break;
    }
    if (text[i] && !/[a-zA-Z0-9_]/.test(text[i]!)) {
      break;
    }
  }
  return -1;
}
