import { useContext } from "react";
import { MapCacheContext } from "../provider";
import type { MapCacheContextValue } from "../types";

/**
 * Advanced hook for accessing internal context (for debugging/testing)
 */
export function useMapCacheContext(): MapCacheContextValue {
  const context = useContext(MapCacheContext);

  if (!context) {
    throw new Error(
      "useMapCacheContext must be used within a MapCacheProvider",
    );
  }

  return context;
}

/**
 * Safe version of useMapCacheContext that returns null instead of throwing
 * when context is not available. Useful for components that might be rendered
 * outside of MapCacheProvider (e.g., in tests or optional integrations).
 */
export function useMapCacheContextSafe(): MapCacheContextValue | null {
  const context = useContext(MapCacheContext);
  return context ?? null;
}