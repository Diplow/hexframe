import type { FavoritesSortOrder } from '~/app/map/Favorites/_utils/favorites-filters';

const SORT_ORDER_STORAGE_KEY = 'favorites-sort-order';
const COLLAPSED_STORAGE_KEY = 'favorites-panel-collapsed';

/**
 * Loads the saved sort order from localStorage.
 * Returns 'name-asc' as the default if no value is stored.
 */
export function loadSortOrder(): FavoritesSortOrder {
  if (typeof window === 'undefined') return 'name-asc';
  const stored = localStorage.getItem(SORT_ORDER_STORAGE_KEY);
  if (
    stored &&
    ['name-asc', 'name-desc', 'date-asc', 'date-desc'].includes(stored)
  ) {
    return stored as FavoritesSortOrder;
  }
  return 'name-asc';
}

/**
 * Saves the sort order to localStorage.
 */
export function saveSortOrder(order: FavoritesSortOrder): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SORT_ORDER_STORAGE_KEY, order);
  }
}

/**
 * Loads the saved collapsed state from localStorage.
 * Returns false as the default if no value is stored.
 */
export function loadCollapsedState(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true';
}

/**
 * Saves the collapsed state to localStorage.
 */
export function saveCollapsedState(collapsed: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed));
  }
}
