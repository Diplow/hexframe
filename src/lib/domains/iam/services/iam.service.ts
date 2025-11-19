import type { User } from "~/lib/domains/iam/_objects/user";
import type { UserRepository } from "~/lib/domains/iam/_repositories/user.repository";
import type {
  UserContract,
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
} from "~/lib/domains/iam/types/contracts";
import {
  UserNotFoundError,
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  WeakPasswordError,
} from "~/lib/domains/iam/types/errors";

/**
 * IAMService
 * 
 * Main service for the IAM domain, orchestrating authentication and user management.
 * This service provides the public API for all IAM operations.
 */
export class IAMService {
  constructor(
    private readonly repositories: {
      user: UserRepository;
    }
  ) {}

  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<User> {
    // Validate password strength
    if (input.password.length < 8) {
      throw new WeakPasswordError("Password must be at least 8 characters");
    }

    // Check if email already exists
    const emailExists = await this.repositories.user.emailExists(input.email);
    if (emailExists) {
      throw new EmailAlreadyExistsError(input.email);
    }

    // Create user
    const user = await this.repositories.user.create({
      email: input.email,
      password: input.password,
      name: input.name,
    });

    return user;
  }

  /**
   * Authenticate a user with email and password
   */
  async login(input: LoginInput): Promise<User> {
    try {
      const result = await this.repositories.user.authenticate({
        email: input.email,
        password: input.password,
      });

      return result.user;
    } catch {
      throw new InvalidCredentialsError();
    }
  }

  /**
   * Get current user by ID
   */
  async getCurrentUser(userId: string): Promise<User | null> {
    return this.repositories.user.findById(userId);
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User> {
    const user = await this.repositories.user.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return user;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User> {
    const user = await this.repositories.user.findByEmail(email);
    if (!user) {
      throw new UserNotFoundError(email);
    }
    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: UpdateProfileInput
  ): Promise<User> {
    const user = await this.getUserById(userId);
    const updatedUser = user.updateProfile(updates);
    return this.repositories.user.update(updatedUser);
  }

  /**
   * Verify user's email
   */
  async verifyEmail(userId: string): Promise<User> {
    return this.repositories.user.verifyEmail(userId);
  }

  /**
   * Convert User entity to API contract
   */
  userToContract(user: User): UserContract {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      image: user.image,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}