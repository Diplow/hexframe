'use client';

import { Search } from 'lucide-react';
import type { FavoritesSortOrder } from '~/app/map/Favorites/_utils/favorites-filters';

export interface FavoritesSearchControlsProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortOrder: FavoritesSortOrder;
  onSortChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

/**
 * Search input and sort dropdown controls for the favorites panel.
 * Renders as a single row with search input and sort dropdown.
 */
export function FavoritesSearchControls({
  searchTerm,
  onSearchChange,
  sortOrder,
  onSortChange,
}: FavoritesSearchControlsProps) {
  return (
    <div className="flex items-center gap-2 flex-1">
      {/* Search input */}
      <div className="relative flex-1">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search favorites..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Sort dropdown */}
      <label htmlFor="favorites-sort" className="sr-only">
        Sort favorites
      </label>
      <select
        id="favorites-sort"
        value={sortOrder}
        onChange={onSortChange}
        aria-label="Sort favorites"
        className="px-2 py-1.5 text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="name-asc">Name (A-Z)</option>
        <option value="name-desc">Name (Z-A)</option>
        <option value="date-desc">Date (newest)</option>
        <option value="date-asc">Date (oldest)</option>
      </select>
    </div>
  );
}
