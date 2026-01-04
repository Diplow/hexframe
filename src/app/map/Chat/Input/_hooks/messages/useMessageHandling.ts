import { useCallback } from 'react';
import { parseMentions } from '~/app/map/Chat/Input/mention-parser';

/**
 * Enriched favorite with coordinate info for task execution.
 * This is the shape returned by favorites.listWithPreviews
 */
interface EnrichedFavorite {
  id: string;
  userId: string;
  mapItemId: number;
  shortcutName: string;
  createdAt: Date;
  title: string;
  preview?: string;
  coordId: string; // Coordinate string for task execution
}

interface UseMessageHandlingProps {
  executeCommand: (command: string) => Promise<string>;
  sendMessage: (message: string) => void;
  isCommand: (message: string) => boolean;
  validateMessage: (message: string) => boolean;
  addToHistory: (message: string) => void;
  setMessage: (message: string) => void;
  closeAutocomplete: () => void;
  resetTextareaHeight: () => void;
  favorites: EnrichedFavorite[];
  executeTask: (taskCoords: string, instruction: string, discussion?: string) => void;
  showSystemMessage: (message: string, level?: 'info' | 'warning' | 'error') => void;
  /** Get current discussion formatted from visible messages */
  getDiscussion: () => string | undefined;
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
  showSystemMessage,
  getDiscussion
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
            // Execute task with the favorite's coordId (coordinate string)
            const discussion = getDiscussion();
            executeTask(favorite.coordId, instruction, discussion);
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
    showSystemMessage,
    getDiscussion
  ]);

  return { handleSend };
}