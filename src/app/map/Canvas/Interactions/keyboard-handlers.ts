/**
 * Keyboard event handlers for Canvas component
 * Manages Ctrl and Shift key detection for navigation and expansion cursors
 */

export function setupKeyboardHandlers() {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey) {
      document.body.setAttribute('data-ctrl-pressed', 'true');
    }
    if (event.shiftKey) {
      document.body.setAttribute('data-shift-pressed', 'true');
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (!event.ctrlKey) {
      document.body.removeAttribute('data-ctrl-pressed');
    }
    if (!event.shiftKey) {
      document.body.removeAttribute('data-shift-pressed');
    }
  };

  const handleWindowBlur = () => {
    document.body.removeAttribute('data-ctrl-pressed');
    document.body.removeAttribute('data-shift-pressed');
  };

  const cleanup = () => {
    document.body.removeAttribute('data-ctrl-pressed');
    document.body.removeAttribute('data-shift-pressed');
  };

  return {
    handleKeyDown,
    handleKeyUp,
    handleWindowBlur,
    cleanup,
  };
}
