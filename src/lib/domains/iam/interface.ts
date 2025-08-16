/**
 * Public API for IAM Domain
 * 
 * Consumers: App layer (auth pages), tRPC API, other domains
 */

// Domain entities
export { User, type UserProps, type CreateUserProps } from './_objects';

// Domain services
export { IAMService } from './services';

// Repository interfaces (for testing/mocking)
export type {
  UserRepository,
  CreateUserInput,
  AuthenticateUserInput,
  AuthenticationResult,
} from './_repositories';

// Domain types
export type {
  LoginInput,
  RegisterInput,
  UserContract,
} from './types';

// Domain errors
export {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  UserNotFoundError,
  WeakPasswordError,
} from './types';

// Server actions (for Next.js forms)
export { loginAction, registerAction } from './actions';

// Infrastructure (for service instantiation)
export { BetterAuthUserRepository } from './infrastructure/interface';