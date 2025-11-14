import type { CacheState } from "~/app/map/Cache/State";
import type { EventBusService } from '~/app/map';
import { loggers } from "~/lib/debug/debug-logger";

/**
 * Event management operations for navigation handler
 */

/**
 * Emit navigation event through event bus
 */
export function emitNavigationEvent(
  fromCenter: string | null,
  toCoordId: string,
  eventBus: EventBusService | undefined,
  getState: () => CacheState
): void {
  if (!eventBus || fromCenter === toCoordId) return;

  const targetItem = getState().itemsById[toCoordId];
  const tileName = targetItem?.data.title ?? 'Untitled';

  // Get the source item name if navigating from a tile
  const sourceItem = fromCenter ? getState().itemsById[fromCenter] : null;
  const fromCenterName = sourceItem?.data.title;

  loggers.mapCache.handlers(`📡 Emitting navigation event`, {
    fromCenter,
    fromCenterName,
    toCoordId,
    targetItemExists: !!targetItem,
    tileName,
    tileDbId: targetItem?.metadata.dbId,
    allItemKeys: Object.keys(getState().itemsById),
  });

  eventBus.emit({
    type: 'map.navigation',
    source: 'map_cache',
    payload: {
      fromCenterId: fromCenter ?? undefined,
      fromCenterName,
      toCenterId: targetItem?.metadata.dbId ?? '',
      toCenterName: tileName
    }
  });
}