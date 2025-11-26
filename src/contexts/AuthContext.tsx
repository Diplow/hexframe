"use client";

import React, {
  createContext,
  useContext,
  type ReactNode,
  useState,
  useEffect,
} from "react";
import { authClient } from "~/lib/auth"; // Your auth client

// Define User type based on what better-auth session returns
// This should align with better-auth's User type or the user object shape it provides.
interface User {
  id: string; // or number, adjust based on better-auth's actual user ID type
  email: string;
  name?: string | null; // better-auth might type name as string | null
  image?: string | null; // better-auth might type image as string | null
  // Potentially other fields from better-auth session user object like emailVerified, etc.
  // emailVerified: boolean;
}

interface AuthContextType {
  user: User | null | undefined; // undefined during loading, null if not logged in
  mappingUserId: string | undefined; // The user's mapping system ID (derived from user.id)
  isLoading: boolean;
}

interface SessionState {
  data: { user: User | null; session: unknown } | null;
  isPending: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Initialize state with the current synchronous value from the Atom
  const [authState, setAuthState] = useState<SessionState>(() =>
    authClient.useSession.get(),
  );

  useEffect(() => {
    // Define the callback to update React state when the Atom changes
    const handleAuthChange = (newState: SessionState) => {
      setAuthState(newState);
    };

    // Subscribe to the Atom
    const unsubscribe = authClient.useSession.subscribe(handleAuthChange);

    // It's good practice to re-fetch/re-set the state immediately after subscribing
    // in case the Atom updated between the initial .get() and the .subscribe() call.
    // This ensures the component has the latest state.
    const initialState = authClient.useSession.get();
    setAuthState(initialState);

    // Return the unsubscribe function to be called on component unmount
    return () => {
      unsubscribe();
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount and unmount

  // Log errors in useEffect to avoid logging during render
  useEffect(() => {
    if (authState.error?.message) {
      console.error("Error fetching session for AuthProvider:", {
        error: authState.error,
        errorMessage: authState.error.message,
      });
    }
  }, [authState.error]);

  // The user object is typically at authState.data.user
  const user = authState.data?.user;
  const isLoading = authState.isPending;
  // mappingUserId is simply the user's ID from better-auth (no separate mapping needed)
  const mappingUserId = user?.id;

  return (
    <AuthContext.Provider value={{ user, mappingUserId, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export { AuthContext };
