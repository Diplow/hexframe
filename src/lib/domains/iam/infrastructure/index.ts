/**
 * Public API for IAM Infrastructure
 *
 * Consumers: IAM services, IAM actions
 */

// Repository implementations
export { BetterAuthUserRepository } from '~/lib/domains/iam/infrastructure/user/better-auth-repository';
export { DrizzleFavoritesRepository } from '~/lib/domains/iam/infrastructure/favorites/drizzle-favorites-repository';