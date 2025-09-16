/**
 * Public API for IAM Domain
 * 
 * Consumers: App layer (auth pages), tRPC API, other domains
 */

// Domain entities
export { User, type UserProps, type CreateUserProps } from '~/lib/domains/iam/_objects';

// Domain services
export { IAMService } from '~/lib/domains/iam/services';

// Repository interfaces (for testing/mocking)
export type {
  UserRepository,
  CreateUserInput,
  AuthenticateUserInput,
  AuthenticationResult,
} from '~/lib/domains/iam/_repositories';

// Domain types
export type {
  LoginInput,
  RegisterInput,
  UserContract,
} from '~/lib/domains/iam/types';

// Domain errors
export {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  UserNotFoundError,
  WeakPasswordError,
} from '~/lib/domains/iam/types';

// Server actions (for Next.js forms)
export { loginAction, registerAction } from '~/lib/domains/iam/actions';

// Infrastructure (for service instantiation)
export { BetterAuthUserRepository } from '~/lib/domains/iam/infrastructure';