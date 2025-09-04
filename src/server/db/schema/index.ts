// Relations are imported in _relations.ts, not needed here

// Core Aggregates
export { baseItems } from "~/server/db/schema/_tables/mapping/base-items";
export { mapItems } from "~/server/db/schema/_tables/mapping/map-items";

export {
  baseItemRelations,
  mapItemRelations,
  userMappingRelations,
  usersRelations,
  accountsRelations,
  sessionsRelations,
} from "./_relations";

// Auth tables for better-auth
export * from "~/server/db/schema/_tables/auth/users";
export * from "~/server/db/schema/_tables/auth/accounts";
export * from "~/server/db/schema/_tables/auth/sessions";
export * from "~/server/db/schema/_tables/auth/verificationTokens";
export * from "~/server/db/schema/_tables/auth/api-keys";

// Mapping/domain-specific tables
export * from "~/server/db/schema/_tables/mapping/base-items";
export * from "~/server/db/schema/_tables/mapping/map-items";
export * from "~/server/db/schema/_tables/mapping/user-mapping";

// LLM job results table
export * from "~/server/db/schema/_tables/llm-job-results";
