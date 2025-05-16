import { integer, text, timestamp } from "drizzle-orm/pg-core";
import { createTable } from "../_utils";

export const baseItems = createTable("base_items", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  title: text("title").notNull(),
  descr: text("descr").notNull(),
  link: text("link"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
