import type { TileData } from "~/app/map/types/tile-data";
import type { CacheState } from "~/app/map/Cache/State/types";
import type { CacheSelectors } from "./types";
import type { Coord } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { MoveMapItemMutation } from "./types";

/**
 * Handles swap operations by delegating to the optimistic-swap module.
 * Provides adapter between move and swap interfaces.
 */
export interface SwapHandler {
  executeSwap: (
    tileA: TileData,
    tileB: TileData,
    coordsA: Coord,
    coordsB: Coord,
    onComplete?: () => void,
    onError?: (error: Error) => void
  ) => Promise<void>;
}

/**
 * Creates a swap handler.
 * NOTE: This is dead code - the actual swap logic is in MutationCoordinator.
 * Kept as a stub to avoid breaking the optimistic-move module which is also unused.
 */
export function createSwapHandler(
  _cacheState: CacheState,
  _selectors: CacheSelectors,
  _updateCache: (updater: (state: CacheState) => CacheState) => void,
  _moveMutation: MoveMapItemMutation
): SwapHandler {
  return {
    executeSwap: async (_tileA, _tileB, _coordsA, _coordsB, onComplete, onError) => {
      // This code path is never executed - actual swaps go through MutationCoordinator
      console.warn('Dead code path: swap-handler.executeSwap was called');
      onError?.(new Error('This swap handler is dead code - use MutationCoordinator'));
    }
  };
}