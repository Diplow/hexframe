import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { type db as dbType, schema } from "~/server/db";
const { userTemplateAllowlist } = schema;
import type {
  TemplateAllowlistRepository,
  UserAllowlist,
  Visibility,
} from "~/lib/domains/agentic/services/_templates/template-allowlist.service";

/**
 * Drizzle ORM implementation of TemplateAllowlistRepository
 *
 * Handles persistence of user template allowlists using PostgreSQL via Drizzle.
 */
export class DrizzleTemplateAllowlistRepository implements TemplateAllowlistRepository {
  constructor(private readonly db: typeof dbType) {}

  async getUserAllowlist(userId: string): Promise<UserAllowlist | null> {
    const [result] = await this.db
      .select()
      .from(userTemplateAllowlist)
      .where(eq(userTemplateAllowlist.userId, userId))
      .limit(1);

    if (!result) return null;

    return {
      userId: result.userId,
      allowedTemplates: result.allowedTemplates,
    };
  }

  async saveUserAllowlist(allowlist: UserAllowlist): Promise<void> {
    const existing = await this.getUserAllowlist(allowlist.userId);

    if (existing) {
      await this.db
        .update(userTemplateAllowlist)
        .set({
          allowedTemplates: allowlist.allowedTemplates,
          updatedAt: new Date(),
        })
        .where(eq(userTemplateAllowlist.userId, allowlist.userId));
    } else {
      await this.db.insert(userTemplateAllowlist).values({
        id: nanoid(),
        userId: allowlist.userId,
        allowedTemplates: allowlist.allowedTemplates,
      });
    }
  }

  async getTemplateVisibility(_templateName: string): Promise<Visibility> {
    // For now, all templates are public
    // Future: Look up template tile and return its visibility
    return 'public';
  }
}
