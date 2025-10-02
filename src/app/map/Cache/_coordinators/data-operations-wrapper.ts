import { useMemo, useCallback, useRef } from "react";
import type { Dispatch } from "react";
import type { CacheState, CacheAction } from "~/app/map/Cache/State";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import { createDataHandlerWithServerService } from "~/app/map/Cache/Handlers";
import type { ServerService } from "~/app/map/Cache/Services";

/**
 * Creates wrapped data operations that always use current state
 */
export function useDataOperationsWrapper(
  dispatch: Dispatch<CacheAction>,
  state: CacheState,
  serverService: ServerService
): DataOperations {
  // Use a ref to avoid recreating the function on every state change
  const stateRef = useRef(state);
  stateRef.current = state;
  const getState = useCallback(() => stateRef.current, []);

  return useMemo(() => {
    // Create handler with getState function
    const handler = createDataHandlerWithServerService(
      dispatch,
      getState,
      serverService,
    );

    // Return the handler directly - no need to wrap anymore
    return handler;
  }, [dispatch, serverService, getState]);
}