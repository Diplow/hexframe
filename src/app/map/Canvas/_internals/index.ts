/**
 * Public API for Canvas Internals subsystem
 */

// Core utilities
export { setupKeyboardHandlers } from '~/app/map/Canvas/_internals/keyboard-handlers';
export { createTileActions } from '~/app/map/Canvas/_internals/tile-actions';
export { shouldShowLoadingState } from '~/app/map/Canvas/_internals/loading-state-helpers';
export { createEventCallbacks } from '~/app/map/Canvas/_internals/event-callbacks';
export { useTileClickHandlers } from '~/app/map/Canvas/_internals/tile-click-handlers';
export { simulateDragStart } from '~/app/map/Canvas/_internals/drag-simulator';

// Menu
export { buildMenuItems } from '~/app/map/Canvas/_internals/menu/items-builder';

// Neighbor helpers
export { getSiblingCoordIds, getParentCoordId } from '~/app/map/Canvas/_internals/neighbor-helpers/coordinate-calculations';
export { calculateNeighborPositions } from '~/app/map/Canvas/_internals/neighbor-helpers/positioning';
export { calculateSpatialDirection } from '~/app/map/Canvas/_internals/neighbor-helpers/spatial-direction';
