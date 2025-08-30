import type { User } from "~/lib/domains/iam/_objects/user";

export interface CreateUserInput {
  email: string;
  password: string;
  name?: string;
}

export interface AuthenticateUserInput {
  email: string;
  password: string;
}

export interface AuthenticationResult {
  user: User;
}

/**
 * UserRepository Interface
 * 
 * Defines the contract for user data access operations.
 * Implementations handle the actual persistence mechanism (e.g., better-auth, database).
 */
export interface UserRepository {
  /**
   * Create a new user with authentication credentials
   */
  create(input: CreateUserInput): Promise<User>;

  /**
   * Find a user by their ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find a user by their email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find a user by their mapping ID
   */
  findByMappingId(mappingId: number): Promise<User | null>;

  /**
   * Authenticate a user with email and password
   * Note: This validates credentials but does not create a session
   */
  authenticate(input: AuthenticateUserInput): Promise<AuthenticationResult>;

  /**
   * Update user profile information
   */
  update(user: User): Promise<User>;

  /**
   * Get or create a mapping ID for a user
   * This is needed for backward compatibility with the mapping system
   */
  ensureMappingId(userId: string): Promise<number>;

  /**
   * Verify a user's email address
   */
  verifyEmail(userId: string): Promise<User>;

  /**
   * Check if an email is already registered
   */
  emailExists(email: string): Promise<boolean>;
}