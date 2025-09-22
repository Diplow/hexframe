// DOM-based drag and drop (decoupled)
export { DOMBasedDragService, createDOMBasedDragService } from '~/app/map/Services/DragAndDrop/DOMBasedDragService';
export { useDOMBasedDrag } from '~/app/map/Services/DragAndDrop/useDOMBasedDrag';
export { useTileRegistration } from '~/app/map/Services/DragAndDrop/useTileRegistration';

export type {
  DragState as DOMDragState,
  TileGeometry,
  DragAndDropEvent as DOMDragEvent
} from '~/app/map/Services/DragAndDrop/DOMBasedDragService';

export type { UseDOMBasedDragReturn } from '~/app/map/Services/DragAndDrop/useDOMBasedDrag';