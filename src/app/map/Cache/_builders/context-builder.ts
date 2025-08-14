import { useMemo } from "react";
import type { Dispatch } from "react";
import type { CacheState, CacheAction } from "../State/types";
import type { DataOperations, MutationOperations, NavigationOperations } from "../Handlers/types";
import type { SyncOperations } from "../Sync/types";
import type { ServerService, StorageService } from "../Services/types";
import type { MapCacheContextValue } from "../types";

export interface ContextBuilderConfig {
  state: CacheState;
  dispatch: Dispatch<CacheAction>;
  dataOperations: DataOperations;
  mutationOperations: MutationOperations;
  navigationOperations: NavigationOperations;
  syncOperations: SyncOperations;
  serverService: ServerService;
  storageService: StorageService;
}

/**
 * Builds the context value from all cache components
 * Ensures a stable context value that minimizes unnecessary re-renders
 */
export function useCacheContextBuilder(config: ContextBuilderConfig): MapCacheContextValue {
  return useMemo(
    () => ({
      state: config.state,
      dispatch: config.dispatch,
      dataOperations: config.dataOperations,
      mutationOperations: config.mutationOperations,
      navigationOperations: config.navigationOperations,
      syncOperations: config.syncOperations,
      serverService: config.serverService,
      storageService: config.storageService,
    }),
    [
      config.state,
      config.dispatch,
      config.dataOperations,
      config.mutationOperations,
      config.navigationOperations,
      config.syncOperations,
      config.serverService,
      config.storageService,
    ],
  );
}