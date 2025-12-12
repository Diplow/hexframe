import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  dualAuthProcedure,
  iamServiceMiddleware,
  mappingServiceMiddleware,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { _requireAuth, _requireFound, _throwBadRequest, _throwInternalError, _throwUnauthorized, _throwNotFound } from "~/server/api/routers/_error-helpers";

// Input validation schemas
const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
  createDefaultMap: z.boolean().default(true),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string(),
});

const updateProfileSchema = z.object({
  name: z.string().optional(),
  image: z.string().url().optional(),
});

/**
 * User Router
 * 
 * Orchestrates user operations across IAM and Mapping domains.
 * This is where cross-domain workflows are implemented.
 * 
 * Architecture Pattern:
 * - IAM Domain: Handles user data, credential validation, profiles
 * - Better-Auth: Handles session creation, cookies, JWT tokens
 * - API Layer (this router): Orchestrates between domains
 * 
 * Example flow:
 * 1. User provides credentials
 * 2. IAM domain validates credentials and returns user entity
 * 3. Better-auth creates session and sets cookies
 * 4. API returns user data (session is in cookies)
 */
export const userRouter = createTRPCRouter({
  /**
   * Register a new user
   * Orchestrates: IAM domain (user creation) + Mapping domain (default map)
   */
  register: publicProcedure
    .use(iamServiceMiddleware)
    .use(mappingServiceMiddleware)
    .input(registerSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Step 1: Create user via IAM domain
        const user = await ctx.iamService.register({
          email: input.email,
          password: input.password,
          name: input.name,
        });

        // Step 2: Create default map if requested
        let defaultMapId: string | undefined;
        if (input.createDefaultMap) {
          try {
            const map = await ctx.mappingService.maps.createMap({
              userId: user.id,
              title: `${user.displayName}'s Space`,
              content: "Your personal hexframe workspace",
            });
            defaultMapId = String(map.id);
          } catch (mapError) {
            // Log error but don't fail registration
            console.error("Failed to create default map:", mapError);
          }
        }

        // Step 3: Create a session for the user (auto-login after registration)
        const { auth } = await import("~/server/auth");
        const { convertToHeaders } = await import("~/server/api/trpc");
        
        // Convert headers for better-auth
        const fetchHeaders = convertToHeaders(ctx.req.headers);
        
        // Sign in the newly created user
        const signInResponse = await auth.api.signInEmail({
          body: {
            email: input.email,
            password: input.password,
          },
          headers: fetchHeaders,
          asResponse: true,
        });

        // Forward session cookies if response is a Response object
        if (signInResponse instanceof Response) {
          const setCookieHeaders = signInResponse.headers.getSetCookie();
          if (setCookieHeaders && setCookieHeaders.length > 0 && ctx.res) {
            ctx.res.setHeader('Set-Cookie', setCookieHeaders);
          }
        }

        // Step 4: Return combined result
        return {
          user: ctx.iamService.userToContract(user),
          defaultMapId,
        };
      } catch (error) {
        if (error instanceof Error) _throwBadRequest(error.message);
        _throwInternalError("Registration failed");
      }
    }),

  /**
   * Login a user
   * Orchestrates: IAM domain (credential validation) + better-auth (session creation)
   */
  login: publicProcedure
    .use(iamServiceMiddleware)
    .input(loginSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Step 1: Validate credentials via IAM domain
        const user = await ctx.iamService.login({
          email: input.email,
          password: input.password,
        });

        // Step 2: Create session via better-auth
        const { auth } = await import("~/server/auth");
        const { convertToHeaders } = await import("~/server/api/trpc");
        
        const fetchHeaders = convertToHeaders(ctx.req.headers);
        const response = await auth.api.signInEmail({
          body: {
            email: input.email,
            password: input.password,
          },
          headers: fetchHeaders,
          asResponse: true,
        });

        // Step 3: Forward session cookies
        if (response instanceof Response) {
          const setCookieHeaders = response.headers.getSetCookie();
          if (setCookieHeaders && setCookieHeaders.length > 0 && ctx.res) {
            ctx.res.setHeader('Set-Cookie', setCookieHeaders);
          }
        }

        // Step 4: Return user data (session handled via cookies)
        return {
          user: ctx.iamService.userToContract(user),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        if (error instanceof Error && error.message.includes("Invalid"))
          _throwUnauthorized("Invalid email or password");
        _throwUnauthorized("Login failed");
      }
    }),

  /**
   * Get current user profile
   */
  me: protectedProcedure
    .use(iamServiceMiddleware)
    .query(async ({ ctx }) => {
      _requireAuth(ctx.user);
      const user = await ctx.iamService.getCurrentUser(ctx.user.id);
      _requireFound(user, "User");
      return ctx.iamService.userToContract(user);
    }),

  /**
   * Get current user profile (MCP-compatible with API key auth)
   */
  getCurrentUser: dualAuthProcedure
    .use(iamServiceMiddleware)
    .query(async ({ ctx }) => {
      _requireAuth(ctx.user);
      const user = await ctx.iamService.getCurrentUser(ctx.user.id);
      _requireFound(user, "User");
      return ctx.iamService.userToContract(user);
    }),

  /**
   * Update user profile
   */
  updateProfile: protectedProcedure
    .use(iamServiceMiddleware)
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      _requireAuth(ctx.user);
      const updatedUser = await ctx.iamService.updateProfile(ctx.user.id, input);
      return ctx.iamService.userToContract(updatedUser);
    }),

  /**
   * Get user by ID
   */
  getById: protectedProcedure
    .use(iamServiceMiddleware)
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const user = await ctx.iamService.getUserById(input.id);
        return ctx.iamService.userToContract(user);
      } catch {
        _throwNotFound("User not found");
      }
    }),

  /**
   * Get user by email
   */
  getByEmail: protectedProcedure
    .use(iamServiceMiddleware)
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      try {
        const user = await ctx.iamService.getUserByEmail(input.email);
        return ctx.iamService.userToContract(user);
      } catch {
        _throwNotFound("User not found");
      }
    }),
});