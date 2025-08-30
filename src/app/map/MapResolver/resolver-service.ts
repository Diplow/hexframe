import { api } from "~/commons/trpc/react";

/**
 * Service for resolving map IDs to coordinates using TRPC
 */
export function useResolverService() {
  
  /**
   * Resolves a database map ID to its coordinate and metadata
   */
  const resolveFromDatabaseId = (mapItemId: number) => {
    return api.map.getRootItemById.useQuery(
      { mapItemId },
      { 
        enabled: !isNaN(mapItemId) && mapItemId > 0,
        staleTime: Infinity, // Cache forever since root items don't change
        // Prevent retries on error to avoid excessive network calls
        retry: false
      }
    );
  };

  return {
    resolveFromDatabaseId
  };
}