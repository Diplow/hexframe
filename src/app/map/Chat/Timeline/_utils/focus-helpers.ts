/**
 * Focus helpers for widget interactions
 * Provides consistent, accessible focus management patterns
 */

export const DEFAULT_FOCUS_DELAY = 100;

export interface FocusTarget {
  selector: string;
  delay?: number;
}

export const FOCUS_TARGETS = {
  CHAT_INPUT: '[data-chat-input]',
} as const;

/**
 * Focuses an element using a callback approach (React-friendly)
 * @param callback - Function that returns the element to focus
 * @param delay - Delay in milliseconds before focusing (default: 100)
 */
export function focusElementWithCallback(
  callback: () => HTMLElement | null,
  delay = DEFAULT_FOCUS_DELAY
): void {
  setTimeout(() => {
    const element = callback();
    element?.focus();
  }, delay);
}

/**
 * Focuses the chat input element
 * Uses the standard data attribute selector
 * @param delay - Delay in milliseconds before focusing (default: 100)
 */
export function focusChatInput(delay = DEFAULT_FOCUS_DELAY): void {
  focusElementWithCallback(
    () => document.querySelector<HTMLTextAreaElement>(FOCUS_TARGETS.CHAT_INPUT),
    delay
  );
}

/**
 * Inserts text into the chat input and focuses it
 * Appends text to existing value, simulating a natural typing action
 * @param text - The text to insert into the chat input
 * @param delay - Delay in milliseconds before inserting (default: 100)
 */
export function insertTextIntoChatInput(text: string, delay = DEFAULT_FOCUS_DELAY): void {
  setTimeout(() => {
    const textarea = document.querySelector<HTMLTextAreaElement>(FOCUS_TARGETS.CHAT_INPUT);
    if (textarea) {
      // Get current value and cursor position
      const currentValue = textarea.value;
      const cursorPosition = textarea.selectionStart ?? currentValue.length;

      // Insert text at cursor position
      const newValue = currentValue.slice(0, cursorPosition) + text + currentValue.slice(cursorPosition);

      // Set new value using native value setter to trigger React's onChange
      const descriptor = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
      if (descriptor?.set) {
        descriptor.set.call(textarea, newValue);

        // Dispatch input event to notify React of the change
        const inputEvent = new Event('input', { bubbles: true });
        textarea.dispatchEvent(inputEvent);
      }

      // Focus and set cursor position after the inserted text
      textarea.focus();
      const newCursorPosition = cursorPosition + text.length;
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    }
  }, delay);
}