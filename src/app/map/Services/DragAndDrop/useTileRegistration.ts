"use client";

import { useCallback, useRef, useEffect } from "react";
import type { UseDOMBasedDragReturn } from "~/app/map/Services/DragAndDrop/useDOMBasedDrag";

/**
 * Hook to automatically register/unregister tiles with the DOM-based drag service
 * This completely decouples tiles from drag logic - they just register their presence
 */
export function useTileRegistration(
  coordId: string,
  dragService: Pick<UseDOMBasedDragReturn, 'registerTile' | 'unregisterTile'> | null
) {
  const currentElementRef = useRef<HTMLElement | null>(null);

  // Stable callback ref that handles element registration/unregistration
  const refCallback = useCallback((element: HTMLElement | null) => {
    // Unregister previous element if it exists
    if (currentElementRef.current && dragService) {
      dragService.unregisterTile(coordId);
    }

    // Store the new element reference
    currentElementRef.current = element;

    // Register new element if it exists and dragService is available
    if (element && dragService) {
      dragService.registerTile(coordId, element);
    }
  }, [coordId, dragService]);

  // Cleanup on unmount - unregister the last element
  useEffect(() => {
    return () => {
      if (currentElementRef.current && dragService) {
        dragService.unregisterTile(coordId);
      }
    };
  }, [coordId, dragService]);

  return refCallback;
}