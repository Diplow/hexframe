import React, { useEffect } from "react";
import { useUnifiedAuth } from "~/contexts/UnifiedAuthContext";
import { useRouter } from "next/navigation"; // For client-side redirection

interface ProtectedPageWrapperProps {
  children: React.ReactNode;
  redirectTo?: string; // Optional redirect path, defaults to /login or a designated auth page
}

export function ProtectedPageWrapper({
  children,
  redirectTo = "/",
}: ProtectedPageWrapperProps) {
  // Redirect to /map (or a generic auth page that handles login/register form display)
  // if trying to access a protected route unauthenticated.
  // The target for unauth users is the AuthTile on the map page if no user is logged in.
  const { user, isLoading } = useUnifiedAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(redirectTo);
    }
  }, [isLoading, user, router, redirectTo]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading authentication state...
      </div>
    );
  }

  if (!user) {
    // This content is shown briefly before redirection kicks in.
    return (
      <div className="flex min-h-screen items-center justify-center">
        Redirecting for authentication...
      </div>
    );
  }

  // If user is authenticated, render the children.
  return <>{children}</>;
}
