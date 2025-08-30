import type { ReactNode, Dispatch } from 'react'

/**
 * Information about a resolved map
 */
export interface ResolvedMapInfo {
  centerCoordinate: string;
  userId: number;
  groupId: number;
  rootItemId: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Internal state for the resolver
 */
export interface MapResolverState {
  // Cache of resolved results by input parameter
  resolvedCache: Map<string, ResolvedMapInfo>;
  // Currently resolving parameters  
  resolvingSet: Set<string>;
}

/**
 * Action types for resolver state updates
 */
export interface ResolverAction {
  type: 'SET_RESOLVED' | 'SET_LOADING' | 'SET_ERROR';
  payload: {
    centerParam: string;
    data?: ResolvedMapInfo;
  };
}

/**
 * Context value provided by MapResolverProvider
 */
export interface MapResolverContextValue {
  resolveMapId: (centerParam: string) => ResolvedMapInfo;
  dispatch: Dispatch<ResolverAction>;
  state: MapResolverState;
}

/**
 * Props for MapResolverProvider
 */
export interface MapResolverProviderProps {
  children: ReactNode;
}