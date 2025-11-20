"use client";

import React, { createContext, useContext, useMemo, useReducer, useCallback } from 'react';
import type { MapResolverContextValue, MapResolverProviderProps, ResolvedMapInfo, MapResolverState, ResolverAction } from '~/app/map/MapResolver/types';

const MapResolverContext = createContext<MapResolverContextValue | null>(null);

function resolverReducer(state: MapResolverState, action: ResolverAction): MapResolverState {
  const { centerParam } = action.payload;
  
  switch (action.type) {
    case 'SET_RESOLVED':
      if (action.payload.data) {
        const newCache = new Map(state.resolvedCache);
        newCache.set(centerParam, action.payload.data);
        return {
          ...state,
          resolvedCache: newCache,
          resolvingSet: new Set([...state.resolvingSet].filter(p => p !== centerParam))
        };
      }
      return state;
      
    case 'SET_LOADING':
      return {
        ...state,
        resolvingSet: new Set([...state.resolvingSet, centerParam])
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        resolvingSet: new Set([...state.resolvingSet].filter(p => p !== centerParam))
      };
      
    default:
      return state;
  }
}

/**
 * Provider that manages map ID resolution with caching
 */
export function MapResolverProvider({ children }: MapResolverProviderProps) {
  const [state, dispatch] = useReducer(resolverReducer, {
    resolvedCache: new Map<string, ResolvedMapInfo>(),
    resolvingSet: new Set<string>()
  });
  
  // Stable function to resolve map IDs - PURE function, no side effects
  const resolveMapId = useCallback((centerParam: string): ResolvedMapInfo => {
    
    // Check cache first (using current state reference)
    const cached = state.resolvedCache.get(centerParam);
    if (cached) {
      return cached;
    }
    
    // Handle empty parameter - return immediately without dispatch
    if (!centerParam) {
      return {
        centerCoordinate: "",
        userId: "0",
        groupId: 0,
        rootItemId: 0,
        isLoading: false,
        error: null,
      };
    }

    // Check if already a coordinate format - return immediately without dispatch
    const isCoordinate = centerParam.includes(",");
    if (isCoordinate) {
      return {
        centerCoordinate: centerParam,
        userId: "0",
        groupId: 0,
        rootItemId: 0,
        isLoading: false,
        error: null,
      };
    }

    // Must be a database ID - need async resolution
    // Return loading state - actual resolution will happen in the hook
    return {
      centerCoordinate: "",
      userId: "0",
      groupId: 0,
      rootItemId: 0,
      isLoading: true,
      error: null,
    };
  }, [state.resolvedCache]); // Include state.resolvedCache since we're using it
  
  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    resolveMapId,
    dispatch,
    state
  }), [resolveMapId, dispatch, state]);
  
  return (
    <MapResolverContext.Provider value={contextValue}>
      {children}
    </MapResolverContext.Provider>
  );
}

/**
 * Hook to access the map resolver context
 */
export function useMapResolverContext(): MapResolverContextValue {
  const context = useContext(MapResolverContext);
  if (!context) {
    throw new Error('useMapResolverContext must be used within MapResolverProvider');
  }
  return context;
}