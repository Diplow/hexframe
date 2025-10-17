import type { Dispatch } from "react";
import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import {
  updateCenter,
  prefetchForNavigation,
  navigateWithoutURL
} from "~/app/map/Cache/Handlers/NavigationHandler/_core/navigation-operations";
import {
  syncURLWithState,
  getMapContext,
  toggleItemExpansionWithURL,
  toggleCompositionExpansionWithURL
} from "~/app/map/Cache/Handlers/NavigationHandler/_url/navigation-url-handlers";

export const createBoundUpdateCenter = (dispatch: Dispatch<CacheAction>) =>
  (centerCoordId: string) => updateCenter(centerCoordId, dispatch);

export const createBoundPrefetchForNavigation = (dataHandler: DataOperations) =>
  (itemCoordId: string) => prefetchForNavigation(itemCoordId, dataHandler);

export const createBoundSyncURLWithState = (getState: () => CacheState) =>
  () => syncURLWithState(getState);

export const createBoundNavigateWithoutURL = (
  getState: () => CacheState,
  dispatch: Dispatch<CacheAction>,
  dataHandler: DataOperations
) => (itemCoordId: string) => navigateWithoutURL(itemCoordId, getState, dispatch, dataHandler);

export const createBoundGetMapContext = (pathname?: string, searchParams?: URLSearchParams) =>
  () => getMapContext(pathname, searchParams);

export const createBoundToggleItemExpansionWithURL = (
  getState: () => CacheState,
  dispatch: Dispatch<CacheAction>
) => (itemId: string) => toggleItemExpansionWithURL(itemId, getState, dispatch);

export const createBoundToggleCompositionExpansionWithURL = (
  getState: () => CacheState,
  dispatch: Dispatch<CacheAction>
) => (coordId: string) => toggleCompositionExpansionWithURL(coordId, getState, dispatch);
