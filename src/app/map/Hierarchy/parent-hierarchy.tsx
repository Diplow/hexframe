"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TileData } from "~/app/map/types/tile-data";
import { useMapCache } from '~/app/map/Cache';
import type { URLInfo } from "~/app/map/types/url-info";
import { BaseTileLayout, TileTooltip } from "~/app/map/Canvas";
import {
  HIERARCHY_TILE_BASE_SIZE,
  HIERARCHY_TILE_SCALE,
} from "~/app/map/constants";
import { getTextColorForDepth } from "~/app/map/types/theme-colors";
import { useUnifiedAuth } from "~/contexts/UnifiedAuthContext";
import { api } from "~/commons/trpc/react";
import { Logo } from "~/components/ui/logo";
import { loggers } from "~/lib/debug/debug-logger";

interface ParentHierarchyProps {
  centerCoordId: string;
  items: Record<string, TileData>;
  urlInfo: URLInfo;
}

interface DynamicHierarchyTileProps {
  item: TileData;
  _hierarchy: TileData[];
  _itemIndex: number;
  _urlInfo: URLInfo;
}

const DynamicHierarchyTile = ({
  item,
}: DynamicHierarchyTileProps) => {
  const { navigateToItem } = useMapCache();
  const renderCountRef = useRef(0);

  useEffect(() => {
    renderCountRef.current += 1;
    loggers.render.hierarchy('DynamicHierarchyTile render', {
      renderCount: renderCountRef.current,
      coordId: item.metadata.coordId,
      name: item.data.title,
      depth: item.metadata.depth,
      color: item.data.color,
    });
  });

  const handleNavigation = async (e: React.MouseEvent) => {
    e.preventDefault();
    loggers.render.hierarchy('DynamicHierarchyTile navigation clicked', {
      coordId: item.metadata.coordId,
      name: item.data.title,
    });
    await navigateToItem(item.metadata.coordId);
  };

  return (
    <TileTooltip preview={item.data.preview} title={item.data.title}>
      <button
        onClick={handleNavigation}
        aria-label={`Navigate to ${item.data.title}`}
        className="group relative flex-shrink-0 cursor-pointer rounded-lg border-none bg-transparent transition-transform duration-200 hover:scale-105 focus:scale-105"
      >
        <div className="pointer-events-none">
          <BaseTileLayout
            coordId={item.metadata.coordId}
            scale={HIERARCHY_TILE_SCALE}
            color={item.data.color}
            baseHexSize={HIERARCHY_TILE_BASE_SIZE}
            isFocusable={false}
          >
            <HierarchyTileContent item={item} />
          </BaseTileLayout>
        </div>
      </button>
    </TileTooltip>
  );
};

const HierarchyTileContent = ({ item }: { item: TileData }) => {
  const textColorClass = getTextColorForDepth(item.metadata.depth);
  
  return (
    <div className="flex h-full w-full items-center justify-center p-2">
      <span
        className={`text-center text-xs font-medium leading-tight ${textColorClass}`}
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
        title={item.data.title}
      >
        {item.data.title}
      </span>
    </div>
  );
};

const UserProfileTile = () => {
  const { user, isLoading: isAuthLoading } = useUnifiedAuth();
  const { navigateToItem } = useMapCache();
  const trpcUtils = api.useUtils();
  const renderCountRef = useRef(0);
  const [isNavigating, setIsNavigating] = useState(false);
  
  useEffect(() => {
    renderCountRef.current += 1;
    loggers.render.hierarchy('UserProfileTile render', {
      renderCount: renderCountRef.current,
      hasUser: !!user,
      userName: user?.name,
      userEmail: user?.email,
    });
  });
  
  const handleUserMapNavigation = async () => {
    // Only navigate if user is logged in
    if (!user) return;
    
    loggers.render.hierarchy('UserProfileTile navigation clicked', {
      userName: user.name,
      userEmail: user.email,
    });
    
    setIsNavigating(true);
    
    try {
      // Fetch user map data when clicking on the profile tile
      // Fetching user map data...
      const userMapData = await trpcUtils.map.user.getUserMap.fetch();
      
      if (userMapData?.success && userMapData.map?.id) {
        // Navigating to user map
        
        // Navigate using the database ID
        // The navigation handler will load the map if it's not in cache
        await navigateToItem(String(userMapData.map.id));
      } else {
        // No user map found
      }
    } catch (_error) {
      console.warn('Failed to fetch/navigate to user map:', _error);
    } finally {
      setIsNavigating(false);
    }
  };
  
  // Determine display name
  const displayName = user
    ? (user.name ?? (user.email ? user.email.split('@')[0] : 'User'))
    : 'Guest';
  
  // Show loading state during auth loading or navigation
  const showLoading = isAuthLoading || isNavigating;
  
  return (
    <button
      onClick={handleUserMapNavigation}
      disabled={!user || isAuthLoading || isNavigating}
      aria-label={isAuthLoading ? 'Loading user profile' : (user ? `Navigate to ${displayName}'s map` : 'Guest user')}
      className={`group relative flex-shrink-0 rounded-lg border-none bg-transparent transition-transform duration-200 ${
        user ? 'cursor-pointer hover:scale-105 focus:scale-105' : 'cursor-default'
      }`}
    >
      <div className="relative flex items-center justify-center">
        <Logo className="w-[97px] h-[112px] flex-shrink-0 scale-110" />
        {showLoading ? (
          <Loader2 className="absolute h-5 w-5 animate-spin text-white" />
        ) : isAuthLoading ? null : (
          <span
            className="absolute text-center text-xs font-semibold text-white select-none"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            title={displayName}
          >
            {displayName}
          </span>
        )}
      </div>
    </button>
  );
};

export const ParentHierarchy = ({
  centerCoordId,
  items,
  urlInfo,
}: ParentHierarchyProps) => {
  const { center, items: cacheItems, getParentHierarchy } = useMapCache();
  const renderCountRef = useRef(0);
  const previousPropsRef = useRef({
    centerCoordId,
    itemsCount: Object.keys(items).length,
    center,
    cacheItemsCount: Object.keys(cacheItems).length,
  });

  // Use currentCenter from cache state if available, otherwise fall back to prop
  const effectiveCenter = center ?? centerCoordId;
  
  // Get hierarchy from cache (it will use the effective center and items internally)
  const hierarchy = getParentHierarchy(effectiveCenter);

  // Track renders and what changed
  useEffect(() => {
    renderCountRef.current += 1;
    const currentProps = {
      centerCoordId,
      itemsCount: Object.keys(items).length,
      center,
      cacheItemsCount: Object.keys(cacheItems).length,
    };

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    
    Object.keys(currentProps).forEach((key) => {
      const typedKey = key as keyof typeof currentProps;
      if (previousPropsRef.current[typedKey] !== currentProps[typedKey]) {
        changes[key] = {
          from: previousPropsRef.current[typedKey],
          to: currentProps[typedKey],
        };
      }
    });

    loggers.render.hierarchy('ParentHierarchy render', {
      renderCount: renderCountRef.current,
      effectiveCenter,
      hierarchyLength: hierarchy.length,
      hierarchyItems: hierarchy.map((item: TileData) => ({
        coordId: item.metadata.coordId,
        name: item.data.title,
        depth: item.metadata.depth,
      })),
      propsChanged: Object.keys(changes).length > 0,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
    });

    previousPropsRef.current = currentProps;
  });

  return (
    <div className="h-full flex-shrink-0 flex flex-col items-center gap-2 bg-transparent p-4 overflow-y-auto">
        <UserProfileTile />
        {hierarchy.length > 0 && (
          <ChevronDown size={16} className="flex-shrink-0 text-neutral-400" />
        )}
        {hierarchy.map((item, index) => (
          <div
            key={`hierarchy-${item.metadata.coordId}`}
            className="flex flex-col items-center gap-1"
          >
            <DynamicHierarchyTile
              item={item}
              _hierarchy={hierarchy}
              _itemIndex={index}
              _urlInfo={urlInfo}
            />
            {index < hierarchy.length - 1 && (
              <ChevronDown size={16} className="flex-shrink-0 text-neutral-400" />
            )}
          </div>
        ))}
    </div>
  );
};
