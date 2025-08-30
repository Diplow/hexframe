"use client";

import React, { type ReactNode } from "react";
import { AuthProvider, useAuth } from "~/contexts/AuthContext";

/**
 * Unified auth provider that uses better-auth
 */
export function UnifiedAuthProvider({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

/**
 * Hook that returns the auth interface
 */
export function useUnifiedAuth() {
  return useAuth();
}