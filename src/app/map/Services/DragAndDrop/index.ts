// Global drag service
export { globalDragService } from '~/app/map/Services/DragAndDrop/GlobalDragService';
export type { TileDropTarget, DragOperation, DropHandler, ValidationHandler } from '~/app/map/Services/DragAndDrop/GlobalDragService';

// Validation utilities
export { validateDragOperation, canDragTile, canDropOnTile, isCenterTile } from '~/app/map/Services/DragAndDrop/_validators/drag-validators';