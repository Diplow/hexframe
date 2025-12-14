'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '~/components/ui/button';

export interface FavoritesPanelHeaderProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * Header component for the FavoritesPanel.
 * Displays the title and collapse toggle button.
 */
export function FavoritesPanelHeader({
  isCollapsed,
  onToggleCollapse,
}: FavoritesPanelHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
      <h2 className="text-sm font-semibold">Favorites</h2>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onToggleCollapse}
        aria-label={isCollapsed ? 'Expand favorites' : 'Collapse favorites'}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
