"use client";

import { useEffect } from "react";
import { api } from "~/commons/trpc/react";
import { authClient } from "~/lib/auth/auth-client";

export default function LogoutPage() {
  const { mutate: logout } = api.auth.logout.useMutation({
    onSuccess: async () => {
      // Clear client-side auth state
      try {
        // Call the better-auth client signOut to clear client-side session
        await authClient.signOut();
      } catch (error) {
        console.error("Client signOut error:", error);
      }
      
      // Clear any offline auth state
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("offline_auth");
      }
      
      // Force reload to clear any cached auth state
      window.location.href = "/";
    },
    onError: (error) => {
      console.error("Logout error:", error);
      // Still try to clear client state even on error
      try {
        void authClient.signOut();
      } catch {
        // Ignore errors during cleanup
      }
      
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("offline_auth");
      }
      
      // Force reload
      window.location.href = "/";
    },
  });

  useEffect(() => {
    // Trigger logout immediately when page loads
    logout();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-900">
      <div className="text-center">
        <h2 className="mb-2 text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
          Logging out...
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400">Please wait while we sign you out.</p>
        <div className="mt-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-se-600 dark:border-se-400 border-r-transparent"></div>
        </div>
      </div>
    </div>
  );
}