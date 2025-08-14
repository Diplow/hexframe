// Relations are imported in _relations.ts, not needed here

// Core Aggregates
export { baseItems } from "./_tables/mapping/base-items";
export { mapItems } from "./_tables/mapping/map-items";

export {
  baseItemRelations,
  mapItemRelations,
  userMappingRelations,
  usersRelations,
  accountsRelations,
  sessionsRelations,
} from "./_relations";

// Auth tables for better-auth
export * from "./_tables/auth/users";
export * from "./_tables/auth/accounts";
export * from "./_tables/auth/sessions";
export * from "./_tables/auth/verificationTokens";

// Mapping/domain-specific tables
export * from "./_tables/mapping/base-items";
export * from "./_tables/mapping/map-items";
export * from "./_tables/mapping/user-mapping";

// LLM job results table
export * from "./_tables/llm-job-results";
