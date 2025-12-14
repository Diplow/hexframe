/**
 * Simulates starting a drag operation from the context menu
 * Sets up visual state and waits for next click to complete the operation
 */
export function simulateDragStart(coordId: string, options: { ctrlKey: boolean }): void {
  const tileElement = document.querySelector(`[data-tile-id="${coordId}"]`);
  if (!tileElement) return;

  // Setup drag state
  const operationType = options.ctrlKey ? 'move' : 'copy';
  document.body.setAttribute('data-drag-active', 'true');
  document.body.setAttribute('data-drag-operation-type', operationType);
  document.body.setAttribute('data-simulated-drag-source', coordId);
  tileElement.setAttribute('data-being-dragged', 'true');

  // Create guidance element
  const guidance = document.createElement('div');
  guidance.id = 'drag-guidance';
  guidance.setAttribute('role', 'status');
  guidance.setAttribute('aria-live', 'polite');
  guidance.textContent = 'Click destination to complete; press ESC to cancel';
  guidance.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:white;padding:12px 24px;border-radius:8px;font-size:14px;z-index:10000;pointer-events:none';
  document.body.appendChild(guidance);

  // Cleanup function
  const cleanup = () => {
    document.body.removeAttribute('data-drag-active');
    document.body.removeAttribute('data-drag-operation-type');
    document.body.removeAttribute('data-simulated-drag-source');
    tileElement.removeAttribute('data-being-dragged');
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeydown);
    document.getElementById('drag-guidance')?.remove();
  };

  // Click handler
  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const targetId = (e.target as HTMLElement).closest('[data-tile-id]')?.getAttribute('data-tile-id');
    if (targetId && targetId !== coordId) {
      const op = document.body.getAttribute('data-drag-operation-type') as 'copy' | 'move';
      document.dispatchEvent(new CustomEvent('simulated-drop', { detail: { sourceId: coordId, targetId, operation: op } }));
    }
    cleanup();
  };

  // Escape key handler
  const onKeydown = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); cleanup(); } };

  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeydown);
}
