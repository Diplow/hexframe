import type { Dispatch } from "react";
import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import { toggleCompositionExpansionWithURL } from "~/app/map/Cache/Handlers/NavigationHandler/_url/navigation-url-handlers";

export const createBoundToggleCompositionExpansionWithURL = (
  getState: () => CacheState,
  dispatch: Dispatch<CacheAction>
) => (coordId: string) => toggleCompositionExpansionWithURL(coordId, getState, dispatch);
