import { useCallback } from 'react';
import { parseMentions } from '~/app/map/Chat/Input/mention-parser';
import type { Favorite } from '~/lib/domains/iam';

interface UseMessageHandlingProps {
  executeCommand: (command: string) => Promise<string>;
  sendMessage: (message: string) => void;
  isCommand: (message: string) => boolean;
  validateMessage: (message: string) => boolean;
  addToHistory: (message: string) => void;
  setMessage: (message: string) => void;
  closeAutocomplete: () => void;
  resetTextareaHeight: () => void;
  favorites: Favorite[];
  executeTask: (taskCoords: string, instruction: string) => void;
  showSystemMessage: (message: string, level?: 'info' | 'warning' | 'error') => void;
}

/**
 * Check if a message contains @mention syntax for favorite shortcuts
 */
function _hasMention(message: string): boolean {
  // Quick check: must contain @ preceded by whitespace or at start
  const atIndex = message.indexOf('@');
  if (atIndex === -1) return false;
  // @ at start or preceded by whitespace
  if (atIndex === 0 || /\s/.test(message[atIndex - 1] ?? '')) {
    // Check if followed by valid shortcut characters
    const afterAt = message.slice(atIndex + 1);
    return /^[a-zA-Z0-9_]+/.test(afterAt);
  }
  return false;
}

/**
 * Custom hook for handling message sending logic
 */
export function useMessageHandling({
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
  showSystemMessage
}: UseMessageHandlingProps) {

  const handleSend = useCallback((message: string) => {
    if (!validateMessage(message)) return;

    const trimmed = message.trim();
    addToHistory(trimmed);

    // Check for slash commands first
    if (isCommand(trimmed)) {
      executeCommand(trimmed).catch((error) => {
        console.error('Failed to execute command:', error);
      });
      setMessage('');
      closeAutocomplete();
      resetTextareaHeight();
      return;
    }

    // Check for @mention syntax
    if (_hasMention(trimmed)) {
      const { mentions, instruction } = parseMentions(trimmed);

      if (mentions.length > 0) {
        // For now, we only support a single mention - use the first one
        const firstMention = mentions[0];
        if (firstMention) {
          // Look up the favorite by shortcut name
          const favorite = favorites.find(
            (f) => f.shortcutName.toLowerCase() === firstMention.shortcutName.toLowerCase()
          );

          if (favorite) {
            // Execute task with the favorite's mapItemId (which is the coord string)
            executeTask(favorite.mapItemId, instruction);
            setMessage('');
            closeAutocomplete();
            resetTextareaHeight();
            return;
          } else {
            // Shortcut not found - show error
            showSystemMessage(
              `Favorite "@${firstMention.shortcutName}" not found. Use /favorites to see available shortcuts.`,
              'error'
            );
            setMessage('');
            closeAutocomplete();
            resetTextareaHeight();
            return;
          }
        }
      }
    }

    // Regular message
    sendMessage(trimmed);
    setMessage('');
    closeAutocomplete();
    resetTextareaHeight();
  }, [
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
    showSystemMessage
  ]);

  return { handleSend };
}