import { integer, text, timestamp } from "drizzle-orm/pg-core";
import { createTable } from "~/server/db/schema/_utils";

export const baseItems = createTable("base_items", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  preview: text("preview"),
  link: text("link"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
