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