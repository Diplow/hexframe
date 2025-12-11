import type {
  FavoritesRepository,
  Favorite,
} from "~/lib/domains/iam/_repositories/favorites.repository";
import {
  DuplicateShortcutNameError,
  InvalidShortcutNameError,
  FavoriteNotFoundError,
} from "~/lib/domains/iam/types/errors";

/**
 * Input for adding a new favorite
 */
interface AddFavoriteInput {
  userId: string;
  mapItemId: string;
  shortcutName: string;
}

/**
 * Validates that a shortcut name contains only alphanumeric characters and underscores
 */
function _isValidShortcutName(shortcutName: string): boolean {
  const trimmed = shortcutName.trim();
  if (trimmed.length === 0) {
    return false;
  }
  // Only allow alphanumeric characters and underscores
  return /^[a-zA-Z0-9_]+$/.test(trimmed);
}

/**
 * Normalizes a shortcut name to lowercase for case-insensitive storage
 */
function _normalizeShortcutName(shortcutName: string): string {
  return shortcutName.toLowerCase();
}

/**
 * FavoritesService
 *
 * Service for managing user tile favorites/bookmarks.
 * Allows users to assign shortcut names to tiles for quick access.
 */
export class FavoritesService {
  constructor(private readonly repository: FavoritesRepository) {}

  /**
   * Add a new favorite with a shortcut name
   */
  async addFavorite(input: AddFavoriteInput): Promise<Favorite> {
    // Validate shortcut name format
    if (!_isValidShortcutName(input.shortcutName)) {
      throw new InvalidShortcutNameError(input.shortcutName);
    }

    const normalizedName = _normalizeShortcutName(input.shortcutName);

    // Check for duplicate shortcut name
    const existsAlready = await this.repository.existsByUserAndShortcut(
      input.userId,
      normalizedName
    );
    if (existsAlready) {
      throw new DuplicateShortcutNameError(normalizedName);
    }

    // Create the favorite
    return this.repository.create({
      userId: input.userId,
      mapItemId: input.mapItemId,
      shortcutName: normalizedName,
    });
  }

  /**
   * Remove a favorite by shortcut name
   */
  async removeFavorite(userId: string, shortcutName: string): Promise<void> {
    const normalizedName = _normalizeShortcutName(shortcutName);

    const favorite = await this.repository.findByUserAndShortcut(
      userId,
      normalizedName
    );
    if (!favorite) {
      throw new FavoriteNotFoundError(shortcutName);
    }

    await this.repository.delete(favorite.id);
  }

  /**
   * Get a favorite by shortcut name (case-insensitive)
   */
  async getFavoriteByShortcut(
    userId: string,
    shortcutName: string
  ): Promise<Favorite> {
    const normalizedName = _normalizeShortcutName(shortcutName);

    const favorite = await this.repository.findByUserAndShortcut(
      userId,
      normalizedName
    );
    if (!favorite) {
      throw new FavoriteNotFoundError(shortcutName);
    }

    return favorite;
  }

  /**
   * List all favorites for a user
   */
  async listFavorites(userId: string): Promise<Favorite[]> {
    return this.repository.findAllByUser(userId);
  }

  /**
   * Update the shortcut name of a favorite
   */
  async updateShortcut(
    userId: string,
    favoriteId: string,
    newShortcutName: string
  ): Promise<Favorite> {
    // Validate shortcut name format
    if (!_isValidShortcutName(newShortcutName)) {
      throw new InvalidShortcutNameError(newShortcutName);
    }

    const normalizedName = _normalizeShortcutName(newShortcutName);

    // Check for duplicate shortcut name (excluding the current favorite)
    const existingFavorite = await this.repository.findByUserAndShortcut(
      userId,
      normalizedName
    );
    if (existingFavorite && existingFavorite.id !== favoriteId) {
      throw new DuplicateShortcutNameError(normalizedName);
    }

    // Update the favorite
    return this.repository.updateShortcutName(favoriteId, normalizedName);
  }
}
