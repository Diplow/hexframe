/**
 * Simulates starting a drag operation from the context menu
 * Sets up visual state and waits for next click to complete the operation
 */
export function simulateDragStart(
  coordId: string,
  options: { ctrlKey: boolean }
): void {
  const tileElement = document.querySelector(`[data-tile-id="${coordId}"]`);

  if (!tileElement) {
    return;
  }

  // Set visual state to indicate drag mode is active
  document.body.setAttribute('data-drag-active', 'true');
  document.body.setAttribute('data-drag-operation-type', options.ctrlKey ? 'move' : 'copy');

  // Mark the source tile as being dragged
  tileElement.setAttribute('data-being-dragged', 'true');

  // Store the source tile ID for the drop handler
  document.body.setAttribute('data-simulated-drag-source', coordId);

  // Create accessible guidance element
  const guidanceElement = document.createElement('div');
  guidanceElement.id = 'drag-guidance';
  guidanceElement.setAttribute('role', 'status');
  guidanceElement.setAttribute('aria-live', 'polite');
  guidanceElement.textContent = 'Click destination to complete; press ESC to cancel';
  guidanceElement.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 10000;
    pointer-events: none;
  `;
  document.body.appendChild(guidanceElement);

  // Add one-time click listener to complete the operation
  const handleClick = (event: MouseEvent) => {
    // Prevent the click from triggering other handlers (like tile creation or preview)
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    // Find the target tile
    const target = event.target as HTMLElement;
    const targetTile = target.closest('[data-tile-id]');

    if (!targetTile) {
      cancelDrag();
      return;
    }

    const targetId = targetTile.getAttribute('data-tile-id');

    if (targetId && targetId !== coordId) {
      // Trigger the drop operation
      const operation = document.body.getAttribute('data-drag-operation-type') as 'copy' | 'move';

      // Dispatch a custom event that the drag service can handle
      const dropEvent = new CustomEvent('simulated-drop', {
        detail: { sourceId: coordId, targetId, operation }
      });
      document.dispatchEvent(dropEvent);
    }

    cancelDrag();
  };

  // Add ESC key listener to cancel the drag
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelDrag();
    }
  };

  const cancelDrag = () => {
    document.body.removeAttribute('data-drag-active');
    document.body.removeAttribute('data-drag-operation-type');
    document.body.removeAttribute('data-simulated-drag-source');
    tileElement.removeAttribute('data-being-dragged');
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeydown);

    // Remove guidance element
    const guidance = document.getElementById('drag-guidance');
    if (guidance) {
      guidance.remove();
    }
  };

  // Use capture phase to intercept clicks before other handlers
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeydown);
}
