import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { users } from "~/server/db/schema";
import type * as schema from "~/server/db/schema";
import { UserMappingService } from "~/server/api/services/user-mapping.service";
import { User } from "../../_objects/user";
import type { auth as authInstance } from "~/server/auth";
import type {
  UserRepository,
  CreateUserInput,
  AuthenticateUserInput,
  AuthenticationResult,
} from "../../_repositories/user.repository";

/**
 * BetterAuthUserRepository
 * 
 * Implements the UserRepository interface using better-auth as the backend.
 * This adapter bridges our domain model with better-auth's authentication system.
 */
export class BetterAuthUserRepository implements UserRepository {
  constructor(
    private readonly auth: typeof authInstance,
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    try {
      // Create user via better-auth API
      const response = await this.auth.api.signUpEmail({
        body: {
          email: input.email,
          password: input.password,
          name: input.name ?? "",
        },
      });

      if (!response.user) {
        throw new Error("Failed to create user");
      }

      // Create mapping ID immediately
      const mappingId = await UserMappingService.getOrCreateMappingUserId(
        response.user.id
      );

      // Create domain User entity
      return User.create({
        id: response.user.id,
        email: response.user.email,
        name: response.user.name ?? undefined,
        emailVerified: response.user.emailVerified ?? false,
        image: response.user.image ?? undefined,
        mappingId,
        createdAt: new Date(response.user.createdAt),
        updatedAt: new Date(response.user.updatedAt),
      });
    } catch (error) {
      if (error instanceof Error) {
        // Handle specific better-auth errors
        if (error.message.includes("already exists")) {
          throw new Error("Email already registered");
        }
        throw error;
      }
      throw new Error("Failed to create user");
    }
  }

  async findById(id: string): Promise<User | null> {
    const dbUser = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!dbUser[0]) {
      return null;
    }

    const mappingId = await UserMappingService.getMappingUserId(id);
    if (!mappingId) {
      // This shouldn't happen, but if it does, create the mapping
      const newMappingId = await UserMappingService.getOrCreateMappingUserId(id);
      return this.dbUserToEntity(dbUser[0], newMappingId);
    }

    return this.dbUserToEntity(dbUser[0], mappingId);
  }

  async findByEmail(email: string): Promise<User | null> {
    const dbUser = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!dbUser[0]) {
      return null;
    }

    const mappingId = await UserMappingService.getMappingUserId(dbUser[0].id);
    if (!mappingId) {
      const newMappingId = await UserMappingService.getOrCreateMappingUserId(
        dbUser[0].id
      );
      return this.dbUserToEntity(dbUser[0], newMappingId);
    }

    return this.dbUserToEntity(dbUser[0], mappingId);
  }

  async findByMappingId(mappingId: number): Promise<User | null> {
    const authUserId = await UserMappingService.getAuthUserId(mappingId);
    if (!authUserId) {
      return null;
    }

    return this.findById(authUserId);
  }

  async authenticate(
    input: AuthenticateUserInput
  ): Promise<AuthenticationResult> {
    try {
      const response = await this.auth.api.signInEmail({
        body: {
          email: input.email,
          password: input.password,
        },
      });

      if (!response.user || !response.token) {
        throw new Error("Invalid credentials");
      }

      const mappingId = await UserMappingService.getOrCreateMappingUserId(
        response.user.id
      );

      const user = User.create({
        id: response.user.id,
        email: response.user.email,
        name: response.user.name ?? undefined,
        emailVerified: response.user.emailVerified ?? false,
        image: response.user.image ?? undefined,
        mappingId,
        createdAt: new Date(response.user.createdAt),
        updatedAt: new Date(response.user.updatedAt),
      });

      // Better-auth returns token directly, we'll create a session structure
      return {
        user,
        session: {
          id: response.token, // Use token as session ID
          token: response.token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("Invalid")) {
        throw new Error("Invalid email or password");
      }
      throw new Error("Authentication failed");
    }
  }

  async update(user: User): Promise<User> {
    // Update user in database
    await this.db
      .update(users)
      .set({
        name: user.name || null,
        image: user.image || null,
        updatedAt: user.updatedAt,
      })
      .where(eq(users.id, user.id));

    return user;
  }

  async ensureMappingId(userId: string): Promise<number> {
    return UserMappingService.getOrCreateMappingUserId(userId);
  }

  async verifyEmail(userId: string): Promise<User> {
    // Update email verification status
    await this.db
      .update(users)
      .set({
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    const user = await this.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  async emailExists(email: string): Promise<boolean> {
    const result = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    return result.length > 0;
  }

  // Helper method to convert database user to domain entity
  private dbUserToEntity(
    dbUser: typeof users.$inferSelect,
    mappingId: number
  ): User {
    return User.create({
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name ?? undefined,
      emailVerified: dbUser.emailVerified ?? false,
      image: dbUser.image ?? undefined,
      mappingId,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    });
  }
}