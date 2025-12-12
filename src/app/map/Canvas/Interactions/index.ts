/**
 * Public API for Canvas Interactions subsystem
 * Handles user input: clicks, keyboard events, and drag operations
 */

export { setupKeyboardHandlers } from '~/app/map/Canvas/Interactions/keyboard-handlers';
export { createTileActions } from '~/app/map/Canvas/Interactions/tile-actions';
export { createEventCallbacks } from '~/app/map/Canvas/Interactions/event-callbacks';
export { useTileClickHandlers } from '~/app/map/Canvas/Interactions/tile-click-handlers';
export { simulateDragStart } from '~/app/map/Canvas/Interactions/drag-simulator';
