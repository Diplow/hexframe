import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { MapCacheHook } from '~/app/map/Cache/types';
import type { Theme } from '~/contexts/ThemeContext';
import type { User } from 'better-auth';

// Mock MapCacheProvider
const MockMapCacheContext = createContext<MapCacheHook | undefined>(undefined);

export const MockMapCacheProvider = ({ children }: { children: ReactNode }) => {
  const mockValue: MapCacheHook = {
    // State queries
    items: {},
    center: null,
    expandedItems: [],
    isLoading: false,
    error: null,
    lastUpdated: Date.now(),

    // Query operations
    getRegionItems: () => [],
    hasItem: () => false,
    isRegionLoaded: () => false,

    // Data operations
    loadRegion: async () => ({ success: true, itemCount: 0 }),
    loadItemChildren: async () => ({ success: true, itemCount: 0 }),
    prefetchRegion: async () => ({ success: true, itemCount: 0 }),
    invalidateRegion: () => {
      // Mock implementation
    },
    invalidateAll: () => {
      // Mock implementation
    },

    // Navigation operations
    navigateToItem: async () => {
      // Mock implementation
    },
    updateCenter: () => {
      // Mock implementation
    },
    prefetchForNavigation: async () => {
      // Mock implementation
    },
    toggleItemExpansionWithURL: () => {
      // Mock implementation
    },

    // Mutation operations
    createItemOptimistic: async () => {
      // Mock implementation
    },
    updateItemOptimistic: async () => {
      // Mock implementation
    },
    deleteItemOptimistic: async () => {
      // Mock implementation
    },
    moveItemOptimistic: async () => ({ success: true }),
    rollbackOptimisticChange: () => {
      // Mock implementation
    },
    rollbackAllOptimistic: () => {
      // Mock implementation
    },
    getPendingOptimisticChanges: () => [],

    // Sync operations
    sync: {
      isOnline: true,
      lastSyncTime: null,
      performSync: async () => ({ 
        success: true, 
        timestamp: Date.now(), 
        itemsSynced: 0, 
        conflictsResolved: 0, 
        duration: 0 
      }),
      forceSync: async () => ({ 
        success: true, 
        timestamp: Date.now(), 
        itemsSynced: 0, 
        conflictsResolved: 0, 
        duration: 0 
      }),
      pauseSync: () => {
        // Mock implementation
      },
      resumeSync: () => {
        // Mock implementation
      },
      getSyncStatus: () => ({ 
        isOnline: true,
        isSyncing: false,
        lastSyncAt: null,
        nextSyncAt: null,
        syncCount: 0,
        errorCount: 0,
        lastError: null
      }),
    },

    // Configuration
    config: {
      maxAge: 300000,
      backgroundRefreshInterval: 60000,
      enableOptimisticUpdates: true,
      maxDepth: 2,
    },
    updateConfig: () => {
      // Mock implementation
    },
  };

  return (
    <MockMapCacheContext.Provider value={mockValue}>
      {children}
    </MockMapCacheContext.Provider>
  );
};

// Mock for useMapCache hook
export const useMapCache = (): MapCacheHook => {
  const context = useContext(MockMapCacheContext);
  if (!context) {
    throw new Error('useMapCache must be used within a MapCacheProvider');
  }
  return context;
};

// Mock ThemeProvider
interface MockThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const MockThemeContext = createContext<MockThemeContextType | undefined>(undefined);

export const MockThemeProvider = ({ children }: { children: ReactNode }) => {
  const mockValue: MockThemeContextType = {
    theme: 'light',
    toggleTheme: () => {
      // Mock implementation
    },
    setTheme: () => {
      // Mock implementation
    },
  };

  return (
    <MockThemeContext.Provider value={mockValue}>
      {children}
    </MockThemeContext.Provider>
  );
};

// Mock for useTheme hook
export const useTheme = () => {
  const context = useContext(MockThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Mock AuthProvider (already exists but let's make sure it's complete)
interface MockAuthContextType {
  user: User | null;
  mappingUserId?: number;
  isLoading: boolean;
  setMappingUserId: (id: number | undefined) => void;
}

const MockAuthContext = createContext<MockAuthContextType | undefined>(undefined);

export const MockAuthProvider = ({ children }: { children: ReactNode }) => {
  const mockValue: MockAuthContextType = {
    user: null,
    mappingUserId: undefined,
    isLoading: false,
    setMappingUserId: () => {
      // Mock implementation
    },
  };

  return (
    <MockAuthContext.Provider value={mockValue}>
      {children}
    </MockAuthContext.Provider>
  );
};

// Mock for useAuth hook
export const useAuth = () => {
  const context = useContext(MockAuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Composite provider that includes all mocks
export const AllMockedProviders = ({ children }: { children: ReactNode }) => {
  return (
    <MockAuthProvider>
      <MockThemeProvider>
        <MockMapCacheProvider>
          {children}
        </MockMapCacheProvider>
      </MockThemeProvider>
    </MockAuthProvider>
  );
};