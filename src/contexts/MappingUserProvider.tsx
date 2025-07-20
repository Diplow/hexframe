"use client";

import { useEffect } from "react";
import { api } from "~/commons/trpc/react";
import { useUnifiedAuth } from "./UnifiedAuthContext";

export function MappingUserProvider({ children }: { children: React.ReactNode }) {
  const { user, setMappingUserId, isLoading: isAuthLoading } = useUnifiedAuth();
  
  // Fetch the mapping user ID when we have an auth user
  const { data: mappingData } = api.map.user.getCurrentUserMappingId.useQuery(undefined, {
    enabled: !!user && !isAuthLoading,
  });
  
  useEffect(() => {
    if (mappingData?.mappingUserId !== undefined) {
      setMappingUserId(mappingData.mappingUserId);
    } else if (!user) {
      setMappingUserId(undefined);
    }
  }, [mappingData?.mappingUserId, user, setMappingUserId]);
  
  return <>{children}</>;
}