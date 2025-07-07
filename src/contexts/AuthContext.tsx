"use client";

import React, {
  createContext,
  useContext,
  type ReactNode,
  useState,
  useEffect,
} from "react";
import { authClient } from "~/lib/auth/auth-client"; // Your auth client

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
  mappingUserId: number | undefined; // The user's mapping system ID
  isLoading: boolean;
  setMappingUserId: (id: number | undefined) => void;
  // Optional: A function to explicitly trigger re-fetching session or handling logout
  // if more complex logic than just invalidating tRPC query is needed client-side.
  // signOut?: () => Promise<void>;
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
  const [mappingUserId, setMappingUserId] = useState<number | undefined>(undefined);

  useEffect(() => {
    // Define the callback to update React state when the Atom changes
    const handleAuthChange = (newState: SessionState) => {
      console.log("Auth state change detected:", {
        hasData: !!newState.data,
        hasUser: !!newState.data?.user,
        isPending: newState.isPending,
        hasError: !!newState.error,
        error: newState.error,
        userId: newState.data?.user?.id,
        userEmail: newState.data?.user?.email,
      });
      setAuthState(newState);
    };

    // Subscribe to the Atom
    const unsubscribe = authClient.useSession.subscribe(handleAuthChange);

    // It's good practice to re-fetch/re-set the state immediately after subscribing
    // in case the Atom updated between the initial .get() and the .subscribe() call.
    // This ensures the component has the latest state.
    setAuthState(authClient.useSession.get());

    // Return the unsubscribe function to be called on component unmount
    return () => {
      unsubscribe();
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount and unmount

  // Log errors if any during session fetching
  if (authState.error) {
    console.error("Error fetching session for AuthProvider:", {
      error: authState.error,
      errorMessage: authState.error?.message,
      errorString: String(authState.error),
      fullAuthState: authState,
    });
  }

  // The user object is typically at authState.data.user
  const user = authState.data?.user;
  const isAuthLoading = authState.isPending;
  // Only wait for mappingUserId if we have a user, otherwise we're not loading
  const isLoading = isAuthLoading;

  return (
    <AuthContext.Provider value={{ user, mappingUserId, isLoading, setMappingUserId }}>
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
