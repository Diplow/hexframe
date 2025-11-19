/**
 * Public API for IAM Infrastructure
 *
 * Consumers: IAM services, IAM actions
 */

// Repository implementations
export { BetterAuthUserRepository } from '~/lib/domains/iam/infrastructure/user/better-auth-repository';

// Services
export { UserMappingService } from '~/lib/domains/iam/infrastructure/user/user-mapping.service';