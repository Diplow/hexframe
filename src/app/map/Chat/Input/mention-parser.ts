/**
 * Represents a single @mention found in text.
 *
 * @property shortcutName - The normalized (lowercase) shortcut name without the @ symbol
 * @property startIndex - Character index where the @ symbol begins in the original text
 * @property endIndex - Character index immediately after the mention ends
 */
export interface Mention {
  shortcutName: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Result of parsing text for @mentions.
 *
 * @property mentions - Array of all valid @mentions found in order of appearance
 * @property instruction - The remaining text after removing all @mentions and trimming whitespace
 */
export interface ParsedMentionResult {
  mentions: Mention[];
  instruction: string;
}

/**
 * Regex to match valid shortcut name characters after the @ symbol.
 * Allows alphanumeric characters and underscores.
 */
const SHORTCUT_CHARS_REGEX = /^[a-zA-Z0-9_]+/;

/**
 * Checks if a character is alphanumeric (a-z, A-Z, or 0-9).
 * Used to detect email-like patterns where @ should not be treated as a mention.
 *
 * @param char - Single character to check, or undefined
 * @returns True if the character is alphanumeric, false otherwise
 */
function _isAlphanumeric(char: string | undefined): boolean {
  if (!char) return false;
  return /[a-zA-Z0-9]/.test(char);
}

/**
 * Checks if a position is immediately after a previously parsed mention.
 * This allows consecutive mentions like "@plan@execute" to be recognized.
 *
 * @param position - The character index to check
 * @param mentions - Array of already-parsed mentions
 * @returns True if the position is at a mention boundary
 */
function _isAtMentionBoundary(
  position: number,
  mentions: Mention[]
): boolean {
  return mentions.some((mention) => mention.endIndex === position);
}

/**
 * Parses @mentions from chat input text.
 *
 * Mentions follow the format `@shortcutName` where shortcutName
 * consists of alphanumeric characters and underscores. The @ symbol
 * must be preceded by whitespace or be at the start of the text
 * (to avoid matching emails like user@example.com).
 *
 * Consecutive mentions are supported (e.g., `@plan@execute`).
 *
 * @param input - The raw input text to parse
 * @returns Object containing found mentions and remaining instruction text
 *
 * @example
 * // Single mention at start
 * parseMentions('@plan do something')
 * // { mentions: [{ shortcutName: 'plan', startIndex: 0, endIndex: 5 }], instruction: 'do something' }
 *
 * @example
 * // Multiple mentions
 * parseMentions('@plan @execute run tests')
 * // { mentions: [...], instruction: 'run tests' }
 *
 * @example
 * // Email-like patterns are ignored
 * parseMentions('email user@example.com')
 * // { mentions: [], instruction: 'email user@example.com' }
 */
export function parseMentions(input: string): ParsedMentionResult {
  const mentions: Mention[] = [];
  let instruction = input;

  let position = 0;
  while (position < input.length) {
    const atIndex = input.indexOf('@', position);
    if (atIndex === -1) break;

    // Check if preceded by alphanumeric (would be email-like)
    // BUT allow if immediately after a previous mention (consecutive mentions)
    const charBefore = atIndex > 0 ? input[atIndex - 1] : undefined;
    if (
      _isAlphanumeric(charBefore) &&
      !_isAtMentionBoundary(atIndex, mentions)
    ) {
      // Skip this @ - it's part of an email or similar
      position = atIndex + 1;
      continue;
    }

    // Try to match shortcut name after @
    const afterAt = input.slice(atIndex + 1);
    const shortcutMatch = SHORTCUT_CHARS_REGEX.exec(afterAt);

    if (!shortcutMatch || shortcutMatch[0].length === 0) {
      // No valid shortcut name after @
      position = atIndex + 1;
      continue;
    }

    const shortcutName = shortcutMatch[0].toLowerCase();
    const startIndex = atIndex;
    const endIndex = atIndex + 1 + shortcutMatch[0].length;

    mentions.push({
      shortcutName,
      startIndex,
      endIndex,
    });

    // Continue searching after this mention
    position = endIndex;
  }

  // Build instruction by removing mention text from the original input
  // Process mentions in reverse order to preserve indices
  const sortedMentions = [...mentions].sort(
    (mentionA, mentionB) => mentionB.startIndex - mentionA.startIndex
  );
  for (const mention of sortedMentions) {
    instruction =
      instruction.slice(0, mention.startIndex) +
      instruction.slice(mention.endIndex);
  }

  // Trim leading/trailing whitespace from instruction
  instruction = instruction.trim();

  return { mentions, instruction };
}
