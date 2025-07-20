import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

interface OfflineUser {
  id: string;
  email: string;
  name: string;
}

interface OfflineSession {
  userId: string;
  expiresAt: string;
}

interface OfflineAuthContextType {
  user: OfflineUser | null;
  session: OfflineSession | null;
  isLoading: boolean;
  mappingUserId: number | undefined;
  setMappingUserId: (id: number | undefined) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const OfflineAuthContext = createContext<OfflineAuthContextType | null>(null);

/**
 * Offline auth provider that uses localStorage for authentication
 * Used for testing and offline mode
 */
export function OfflineAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<OfflineUser | null>(null);
  const [session, setSession] = useState<OfflineSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mappingUserId, setMappingUserId] = useState<number | undefined>(undefined);

  // Load auth data from localStorage on mount
  useEffect(() => {
    try {
      const authData = window.localStorage.getItem("offline_auth");
      if (authData) {
        const parsed = JSON.parse(authData) as { user: OfflineUser; session: OfflineSession };
        setUser(parsed.user);
        setSession(parsed.session);
      }
    } catch (error) {
      console.error("[OfflineAuth] Failed to load auth data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveAuthData = (user: OfflineUser, session: OfflineSession) => {
    setUser(user);
    setSession(session);
    window.localStorage.setItem("offline_auth", JSON.stringify({ user, session }));
  };

  const signIn = async (email: string, _password: string) => {
    // In offline mode, we just create a session based on email
    const userId = email.split("@")[0] ?? "offline-user";
    const newUser: OfflineUser = {
      id: userId,
      email,
      name: `Offline ${userId}`,
    };
    const newSession: OfflineSession = {
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    saveAuthData(newUser, newSession);
  };

  const signUp = async (email: string, _password: string, name: string) => {
    // In offline mode, registration just creates a local user
    const userId = `user-${Date.now()}`;
    const newUser: OfflineUser = {
      id: userId,
      email,
      name,
    };
    const newSession: OfflineSession = {
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    saveAuthData(newUser, newSession);

    // Also create initial map data for the new user
    const initialMapData = {
      items: {
        [`${userId},0:`]: {
          metadata: {
            dbId: 1,
            coordId: `${userId},0:`,
            parentId: undefined,
            coordinates: { userId: parseInt(userId.replace("user-", "")), groupId: 0, path: [] },
            depth: 0,
            ownerId: userId,
          },
          data: {
            name,
            description: "Your personal hexframe map",
            url: "",
            color: "zinc-50",
          },
          state: {
            isDragged: false,
            isHovered: false,
            isSelected: false,
            isExpanded: false,
            isDragOver: false,
            isHovering: false,
          },
        },
      },
      center: `${userId},0:`,
      maxDepth: 3,
      timestamp: Date.now(),
    };

    // Save initial map data
    window.localStorage.setItem(
      "mapCache:data",
      JSON.stringify({
        data: initialMapData,
        metadata: { version: 1, timestamp: Date.now() }
      })
    );
  };

  const signOut = async () => {
    setUser(null);
    setSession(null);
    window.localStorage.removeItem("offline_auth");
  };

  return (
    <OfflineAuthContext.Provider value={{ user, session, isLoading, mappingUserId, setMappingUserId, signIn, signUp, signOut }}>
      {children}
    </OfflineAuthContext.Provider>
  );
}

export function useOfflineAuth() {
  const context = useContext(OfflineAuthContext);
  if (!context) {
    throw new Error("useOfflineAuth must be used within OfflineAuthProvider");
  }
  return context;
}

/**
 * Helper to determine if we should use offline auth
 */
export function shouldUseOfflineAuth(): boolean {
  if (typeof window === "undefined") return false;
  
  // Check for explicit offline mode flag
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("offline") === "true") return true;
  
  // Check for E2E test environment
  if (process.env.NEXT_PUBLIC_E2E_OFFLINE === "true") return true;
  
  // Check for offline header (from Playwright)
  if (typeof window !== "undefined" && window.localStorage.getItem("offline_mode") === "true") return true;
  
  // Check network status
  if (!navigator.onLine) return true;
  
  return false;
}

/**
 * Helper to determine if we should use offline mode for the cache
 */
export function isOfflineMode(): boolean {
  return shouldUseOfflineAuth();
}