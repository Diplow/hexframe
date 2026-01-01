"use client";

import { useEffect } from "react";
import type { Dispatch } from "react";
import type { CacheAction } from "~/app/map/Cache/State";
import type { ServerService } from "~/app/map/Cache/Services";
import type { EventBusService } from "~/app/map/types/events";
import type { AppEvent } from "~/lib/utils/event-bus/types";
import { loadRegion, removeItem } from "~/app/map/Cache/State";

/**
 * Allowed event sources for tile mutations from external systems.
 * Events from 'map_cache' are already handled by MutationCoordinator.
 */
const EXTERNAL_SOURCES = new Set(["agentic"]);

/**
 * Type guard for tile mutation event payloads
 */
interface TileMutationPayload {
  tileId: string;
  tileName: string;
  coordId: string;
  parentId?: string;
  changes?: Record<string, unknown>;
}

function _isTileMutationPayload(payload: unknown): payload is TileMutationPayload {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }
  const typedPayload = payload as Record<string, unknown>;
  return (
    typeof typedPayload.tileId === "string" &&
    typeof typedPayload.tileName === "string" &&
    typeof typedPayload.coordId === "string"
  );
}

/**
 * Validates an event is from an external source and has valid payload.
 * Returns the coordId if valid, null otherwise.
 */
function _validateExternalEvent(event: AppEvent, eventType: string): string | null {
  if (!EXTERNAL_SOURCES.has(event.source)) {
    return null;
  }
  if (!_isTileMutationPayload(event.payload)) {
    console.warn(`[TileMutationHandler] Invalid payload for ${eventType} event`);
    return null;
  }
  return event.payload.coordId;
}

/**
 * Creates a handler that fetches and dispatches a tile update for create/update events.
 */
function _createFetchHandler(
  dispatch: Dispatch<CacheAction>,
  serverService: ServerService,
  eventType: string
) {
  return async (event: AppEvent) => {
    const coordId = _validateExternalEvent(event, eventType);
    if (!coordId) return;

    try {
      const item = await serverService.getItemByCoordinate(coordId);
      if (item) {
        dispatch(loadRegion([item], coordId, 1));
      }
    } catch (error) {
      console.warn(`[TileMutationHandler] Failed to fetch ${eventType} tile:`, coordId, error);
    }
  };
}

/**
 * Hook that subscribes to tile mutation events from external sources (like agent execution)
 * and updates the cache state accordingly.
 *
 * Only processes events from the 'agentic' source to avoid double-processing
 * events that were already handled by the MutationCoordinator.
 */
export function useTileMutationEffect(
  eventBus: EventBusService | undefined,
  dispatch: Dispatch<CacheAction>,
  serverService: ServerService
): void {
  useEffect(() => {
    if (!eventBus) return;

    const handleTileCreated = _createFetchHandler(dispatch, serverService, "tile_created");
    const handleTileUpdated = _createFetchHandler(dispatch, serverService, "tile_updated");

    const handleTileDeleted = (event: AppEvent) => {
      const coordId = _validateExternalEvent(event, "tile_deleted");
      if (coordId) {
        dispatch(removeItem(coordId));
      }
    };

    const unsubscribeCreated = eventBus.on("map.tile_created", (e) => void handleTileCreated(e));
    const unsubscribeUpdated = eventBus.on("map.tile_updated", (e) => void handleTileUpdated(e));
    const unsubscribeDeleted = eventBus.on("map.tile_deleted", handleTileDeleted);

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, [eventBus, dispatch, serverService]);
}
