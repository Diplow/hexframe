import { useEffect, useRef } from "react";
import type { UseDOMBasedDragReturn } from "~/app/map/Services/DragAndDrop/useDOMBasedDrag";

/**
 * Hook to automatically register/unregister tiles with the DOM-based drag service
 * This completely decouples tiles from drag logic - they just register their presence
 */
export function useTileRegistration(
  coordId: string,
  dragService: Pick<UseDOMBasedDragReturn, 'registerTile' | 'unregisterTile'> | null
) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (element && dragService) {
      // Register this tile's geometry with the drag service
      dragService.registerTile(coordId, element);

      // Cleanup on unmount
      return () => {
        dragService.unregisterTile(coordId);
      };
    }
  }, [coordId, dragService]);

  return elementRef;
}