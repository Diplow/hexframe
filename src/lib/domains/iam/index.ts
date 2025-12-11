/**
 * Public API for IAM Domain
 * 
 * Consumers: App layer (auth pages), tRPC API, other domains
 */

// Domain entities
export { User, type UserProps, type CreateUserProps } from '~/lib/domains/iam/_objects';

// Domain services
export { IAMService, FavoritesService } from '~/lib/domains/iam/services';

// Repository interfaces (for testing/mocking)
export type {
  UserRepository,
  CreateUserInput,
  AuthenticateUserInput,
  AuthenticationResult,
  FavoritesRepository,
  Favorite,
  CreateFavoriteInput,
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
  DuplicateShortcutNameError,
  InvalidShortcutNameError,
  FavoriteNotFoundError,
} from '~/lib/domains/iam/types';

// Server actions (for Next.js forms)
export { loginAction, registerAction } from '~/lib/domains/iam/actions';

// Infrastructure (for service instantiation)
export { BetterAuthUserRepository, DrizzleFavoritesRepository } from '~/lib/domains/iam/infrastructure';

// Internal API key management (server-only, for MCP and other internal services)
export {
  getOrCreateInternalApiKey,
  rotateInternalApiKey,
  validateInternalApiKey,
} from '~/lib/domains/iam/services/internal-api-key.service';