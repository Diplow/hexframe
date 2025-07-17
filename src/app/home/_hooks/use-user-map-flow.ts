import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/commons/trpc/react";

export type MapFlowState = 
  | "loading"
  | "unauthenticated"
  | "fetching_map"
  | "creating_map"
  | "redirecting"
  | "error";

export type FlowError =
  | { type: "map_creation"; message: string }
  | { type: "map_fetch"; message: string };

interface UseUserMapFlowResult {
  state: MapFlowState;
  error: FlowError | null;
  retry: () => void;
}

interface UseUserMapFlowOptions {
  user: { id: string; name?: string | null; email: string; image?: string | null } | null | undefined;
  isAuthLoading: boolean;
}

/**
 * Manages the complete flow from authentication check to map access
 * Handles: auth state → map query → map creation → navigation
 */
export function useUserMapFlow({ user, isAuthLoading }: UseUserMapFlowOptions): UseUserMapFlowResult {
  const router = useRouter();
  const [state, setState] = useState<MapFlowState>("loading");
  const [error, setError] = useState<FlowError | null>(null);

  // Add a delay to prevent race conditions during registration
  const [canQueryMap, setCanQueryMap] = useState(false);
  
  useEffect(() => {
    if (!!user && !isAuthLoading) {
      // Small delay to ensure session and map creation are complete
      const timer = setTimeout(() => {
        setCanQueryMap(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanQueryMap(false);
    }
  }, [user, isAuthLoading]);

  // Query for user's map - only enabled when authenticated and after delay
  const getUserMapQuery = api.map.user.getUserMap.useQuery(undefined, {
    enabled: canQueryMap,
    retry: false,
  });

  // Mutation to create default map
  const createMapMutation = api.map.user.createDefaultMapForCurrentUser.useMutation({
    onSuccess: (data) => {
      if (data.success && data.mapId) {
        setState("redirecting");
        router.push(`/map?center=${data.mapId}`);
      } else {
        setError({ type: "map_creation", message: "Failed to create your workspace. Please contact an administrator." });
        setState("error");
      }
    },
    onError: () => {
      setError({ type: "map_creation", message: "An error occurred while creating your workspace. Please contact an administrator." });
      setState("error");
    },
  });

  // Update state based on auth and query status
  useEffect(() => {
    if (isAuthLoading) {
      setState("loading");
      return;
    }

    if (!user) {
      setState("unauthenticated");
      return;
    }

    if (getUserMapQuery.isLoading || getUserMapQuery.isFetching) {
      setState("fetching_map");
      return;
    }

    if (getUserMapQuery.isError) {
      setError({ type: "map_fetch", message: "Network error accessing your map data" });
      setState("error");
      return;
    }

    if (getUserMapQuery.data) {
      const data = getUserMapQuery.data;
      
      
      if (data.success && data.map?.id) {
        setState("redirecting");
        router.push(`/map?center=${data.map.id}`);
      } else if (!data.success && data.error === "No map found") {
        // Trigger map creation
        if (!createMapMutation.isPending && !createMapMutation.data) {
          setState("creating_map");
          createMapMutation.mutate();
        }
      } else if (!data.success) {
        setError({ type: "map_fetch", message: data.error || "Failed to retrieve your map details" });
        setState("error");
      }
    }
  }, [
    isAuthLoading,
    user,
    getUserMapQuery.isLoading,
    getUserMapQuery.isFetching,
    getUserMapQuery.isError,
    getUserMapQuery.data,
    createMapMutation.isPending,
    createMapMutation.data,
    createMapMutation.isError,
    createMapMutation,
    router,
  ]);

  const retry = () => {
    setError(null);
    setState("loading");
    void getUserMapQuery.refetch();
  };

  return { state, error, retry };
}