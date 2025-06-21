"use client";

import { useEffect } from 'react';
import { useTileActions } from '../../Canvas/TileActionsContext';
import { useAuth } from '~/contexts/AuthContext';
import { CoordSystem } from '~/lib/domains/mapping/utils/hex-coordinates';
import type { ReactNode } from 'react';
import type { ToolType } from '../../Canvas/TileActionsContext';

interface ToolStateManagerProps {
  children: ReactNode;
  // The current center of the map
  mapCenterCoordId: string;
}

/**
 * Manages which tools should be disabled based on the current map context.
 * Updates the TileActionsContext with disabled tools based on space ownership.
 */
export function ToolStateManager({ children, mapCenterCoordId }: ToolStateManagerProps) {
  const { setDisabledTools } = useTileActions();
  const { mappingUserId } = useAuth();
  
  useEffect(() => {
    const newDisabledTools = new Set<ToolType>();
    
    // Parse the map center coordinate to check space ownership
    const coord = CoordSystem.parseId(mapCenterCoordId);
    const userOwnsThisSpace = mappingUserId !== undefined && coord.userId === mappingUserId;
    
    // Disable create, edit, delete, and drag tools if user doesn't own the space
    if (!userOwnsThisSpace) {
      newDisabledTools.add('create');
      newDisabledTools.add('edit');
      newDisabledTools.add('delete');
      newDisabledTools.add('drag');
    }
    
    setDisabledTools(newDisabledTools);
  }, [mapCenterCoordId, mappingUserId, setDisabledTools]);
  
  return <>{children}</>;
}