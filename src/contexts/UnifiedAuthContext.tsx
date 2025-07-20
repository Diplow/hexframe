"use client";

import React, { type ReactNode } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import { OfflineAuthProvider, shouldUseOfflineAuth, useOfflineAuth } from "./OfflineAuthContext";

/**
 * Unified auth provider that chooses between online and offline auth
 * based on the current environment and network status
 */
export function UnifiedAuthProvider({ children }: { children: ReactNode }) {
  // Check if we should use offline auth
  const useOffline = shouldUseOfflineAuth();

  if (useOffline) {
    console.log("[UnifiedAuth] Using offline auth provider");
    return <OfflineAuthProvider>{children}</OfflineAuthProvider>;
  }

  console.log("[UnifiedAuth] Using online auth provider");
  return <AuthProvider>{children}</AuthProvider>;
}

/**
 * Hook that works with both online and offline auth providers
 * Returns a unified interface regardless of which provider is active
 */
export function useUnifiedAuth() {
  const isOffline = shouldUseOfflineAuth();
  
  if (isOffline) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const offlineAuth = useOfflineAuth();
    // Transform offline auth to match online auth interface
    return {
      user: offlineAuth.user ? {
        id: offlineAuth.user.id,
        email: offlineAuth.user.email,
        name: offlineAuth.user.name,
        image: null
      } : null,
      mappingUserId: offlineAuth.mappingUserId,
      isLoading: offlineAuth.isLoading,
      setMappingUserId: offlineAuth.setMappingUserId
    };
  } else {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useAuth();
  }
}