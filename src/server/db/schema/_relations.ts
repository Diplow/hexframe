import { relations } from "drizzle-orm";
import { mapItems } from "~/server/db/schema/_tables/mapping/map-items";
import { baseItems } from "~/server/db/schema/_tables/mapping/base-items";
import { baseItemVersions } from "~/server/db/schema/_tables/mapping/base-item-versions";
import { userMapping } from "~/server/db/schema/_tables/mapping/user-mapping";
import { users } from "~/server/db/schema/_tables/auth/users";
import { accounts } from "~/server/db/schema/_tables/auth/accounts";
import { sessions } from "~/server/db/schema/_tables/auth/sessions";

/**
 * Relations for map_items table
 */
export const mapItemRelations = relations(mapItems, ({ one, many }) => ({
  // Many-to-one: MapItem -> BaseItem (referenced item)
  referencedItem: one(baseItems, {
    fields: [mapItems.refItemId],
    references: [baseItems.id],
  }),

  // Self-referencing relationships
  // Many-to-one: MapItem -> Parent MapItem
  parent: one(mapItems, {
    fields: [mapItems.parentId],
    references: [mapItems.id],
    relationName: "parentItem", // Alias for self-relation
  }),
  // One-to-many: MapItem -> Children MapItems
  children: many(mapItems, {
    relationName: "parentItem", // Corresponds to parent relationName
  }),
}));

/**
 * Relations for base_items table
 */
export const baseItemRelations = relations(baseItems, ({ one, many }) => ({
  // One-to-many: BaseItem -> Referencing MapItems
  mapItems: many(mapItems),
  // One-to-many: BaseItem -> Version History
  versions: many(baseItemVersions),

  // Self-referencing relationships for content lineage
  // Many-to-one: BaseItem -> Origin BaseItem (the content this was copied from)
  origin: one(baseItems, {
    fields: [baseItems.originId],
    references: [baseItems.id],
    relationName: "originItem", // Alias for self-relation
  }),
  // One-to-many: BaseItem -> Derived BaseItems (content copied from this)
  derivedItems: many(baseItems, {
    relationName: "originItem", // Corresponds to origin relationName
  }),
}));

/**
 * Relations for base_item_versions table
 */
export const baseItemVersionsRelations = relations(
  baseItemVersions,
  ({ one }) => ({
    // Many-to-one: Version -> BaseItem
    baseItem: one(baseItems, {
      fields: [baseItemVersions.baseItemId],
      references: [baseItems.id],
    }),
  })
);

/**
 * Relations for user_mapping table
 */
export const userMappingRelations = relations(userMapping, ({ one }) => ({
  // Many-to-one: UserMapping -> User (auth user)
  authUser: one(users, {
    fields: [userMapping.authUserId],
    references: [users.id],
  }),
}));

// Relations for Auth tables
export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  // One-to-one: User -> UserMapping (for mapping to integer IDs)
  userMapping: one(userMapping, {
    fields: [users.id],
    references: [userMapping.authUserId],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
