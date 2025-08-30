import { integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { createTable } from "~/server/db/schema/_utils";
import { users } from "~/server/db/schema/_tables/auth/users";

export const userMapping = createTable(
  "user_mapping",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    authUserId: text("auth_user_id")
      .notNull()
      .unique()
      .references(() => users.id),
    mappingUserId: integer("mapping_user_id").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    authUserIdIdx: index("user_mapping_auth_user_id_idx").on(table.authUserId),
    mappingUserIdIdx: index("user_mapping_mapping_user_id_idx").on(
      table.mappingUserId,
    ),
  }),
);

export type UserMapping = typeof userMapping.$inferSelect;
export type NewUserMapping = typeof userMapping.$inferInsert;
