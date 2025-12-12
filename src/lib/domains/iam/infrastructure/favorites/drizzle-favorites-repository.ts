import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { type db as dbType, schema } from "~/server/db";
const { tileFavorites } = schema;
import type {
  FavoritesRepository,
  Favorite,
  CreateFavoriteInput,
} from "~/lib/domains/iam/_repositories/favorites.repository";

/**
 * Drizzle ORM implementation of FavoritesRepository
 *
 * Handles persistence of user tile favorites using PostgreSQL via Drizzle.
 */
export class DrizzleFavoritesRepository implements FavoritesRepository {
  constructor(private readonly db: typeof dbType) {}

  async create(input: CreateFavoriteInput): Promise<Favorite> {
    const id = nanoid();
    const [result] = await this.db
      .insert(tileFavorites)
      .values({
        id,
        userId: input.userId,
        mapItemId: input.mapItemId,
        shortcutName: input.shortcutName,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create favorite");
    }

    return {
      id: result.id,
      userId: result.userId,
      mapItemId: result.mapItemId,
      shortcutName: result.shortcutName,
      createdAt: result.createdAt,
    };
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(tileFavorites).where(eq(tileFavorites.id, id));
  }

  async findByUserAndShortcut(
    userId: string,
    shortcutName: string
  ): Promise<Favorite | null> {
    const [result] = await this.db
      .select()
      .from(tileFavorites)
      .where(
        and(
          eq(tileFavorites.userId, userId),
          eq(tileFavorites.shortcutName, shortcutName)
        )
      )
      .limit(1);

    if (!result) return null;

    return {
      id: result.id,
      userId: result.userId,
      mapItemId: result.mapItemId,
      shortcutName: result.shortcutName,
      createdAt: result.createdAt,
    };
  }

  async findAllByUser(userId: string): Promise<Favorite[]> {
    const results = await this.db
      .select()
      .from(tileFavorites)
      .where(eq(tileFavorites.userId, userId));

    return results.map((result) => ({
      id: result.id,
      userId: result.userId,
      mapItemId: result.mapItemId,
      shortcutName: result.shortcutName,
      createdAt: result.createdAt,
    }));
  }

  async existsByUserAndShortcut(
    userId: string,
    shortcutName: string
  ): Promise<boolean> {
    const result = await this.findByUserAndShortcut(userId, shortcutName);
    return result !== null;
  }

  /**
   * Find a favorite by user ID and map item ID
   * Useful for checking if a specific tile is already favorited
   */
  async findByUserAndMapItem(
    userId: string,
    mapItemId: number
  ): Promise<Favorite | null> {
    const [result] = await this.db
      .select()
      .from(tileFavorites)
      .where(
        and(
          eq(tileFavorites.userId, userId),
          eq(tileFavorites.mapItemId, mapItemId)
        )
      )
      .limit(1);

    if (!result) return null;

    return {
      id: result.id,
      userId: result.userId,
      mapItemId: result.mapItemId,
      shortcutName: result.shortcutName,
      createdAt: result.createdAt,
    };
  }

  /**
   * Delete a favorite by user ID and map item ID
   * Useful for removing a favorite without knowing its ID
   */
  async deleteByUserAndMapItem(
    userId: string,
    mapItemId: number
  ): Promise<void> {
    await this.db
      .delete(tileFavorites)
      .where(
        and(
          eq(tileFavorites.userId, userId),
          eq(tileFavorites.mapItemId, mapItemId)
        )
      );
  }

  /**
   * Update the shortcut name of a favorite
   */
  async updateShortcutName(id: string, newShortcutName: string): Promise<Favorite> {
    const [result] = await this.db
      .update(tileFavorites)
      .set({ shortcutName: newShortcutName })
      .where(eq(tileFavorites.id, id))
      .returning();

    if (!result) {
      throw new Error("Failed to update favorite shortcut name");
    }

    return {
      id: result.id,
      userId: result.userId,
      mapItemId: result.mapItemId,
      shortcutName: result.shortcutName,
      createdAt: result.createdAt,
    };
  }
}
