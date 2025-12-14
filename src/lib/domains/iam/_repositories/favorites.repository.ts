/**
 * Favorite entity as returned by the repository
 *
 * Note: mapItemId is an opaque integer ID. The IAM domain does not
 * need to know about the mapping domain - enrichment with coordinates
 * and tile data happens at the router/API layer.
 */
export interface Favorite {
  id: string;
  userId: string;
  mapItemId: number;
  shortcutName: string;
  createdAt: Date;
}

/**
 * Input for creating a new favorite
 */
export interface CreateFavoriteInput {
  userId: string;
  mapItemId: number;
  shortcutName: string;
}

/**
 * FavoritesRepository Interface
 *
 * Defines the contract for favorites data access operations.
 * Implementations handle the actual persistence mechanism (e.g., database).
 */
export interface FavoritesRepository {
  /**
   * Create a new favorite
   */
  create(input: CreateFavoriteInput): Promise<Favorite>;

  /**
   * Delete a favorite by its ID
   */
  delete(id: string): Promise<void>;

  /**
   * Find a favorite by user ID and shortcut name
   */
  findByUserAndShortcut(
    userId: string,
    shortcutName: string
  ): Promise<Favorite | null>;

  /**
   * Find all favorites for a user
   */
  findAllByUser(userId: string): Promise<Favorite[]>;

  /**
   * Check if a shortcut name already exists for a user
   */
  existsByUserAndShortcut(userId: string, shortcutName: string): Promise<boolean>;

  /**
   * Update the shortcut name of a favorite
   */
  updateShortcutName(id: string, newShortcutName: string): Promise<Favorite>;
}
