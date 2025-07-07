import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  iamServiceMiddleware,
  mappingServiceMiddleware,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

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
              userId: user.mappingId,
              title: `${user.displayName}'s Space`,
              descr: "Your personal hexframe workspace",
            });
            defaultMapId = String(map.id);
          } catch (mapError) {
            // Log error but don't fail registration
            console.error("Failed to create default map:", mapError);
          }
        }

        // Step 3: Create a session for the user (auto-login after registration)
        // Create a mock request with the new user's credentials to sign them in
        const signInRequest = new Request(`${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/api/auth/sign-in/email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Forward cookies from the original request
            cookie: ctx.req.headers.cookie ?? "",
          },
          body: JSON.stringify({
            email: input.email,
            password: input.password,
          }),
        });

        // Use auth handler to sign in the user
        const { auth } = await import("~/server/auth");
        const signInResponse = await auth.handler(signInRequest);
        
        // Forward the set-cookie headers to establish the session
        if (signInResponse.ok) {
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
        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Registration failed",
        });
      }
    }),

  /**
   * Login a user
   */
  login: publicProcedure
    .use(iamServiceMiddleware)
    .input(loginSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Use better-auth to handle the login
        const { auth } = await import("~/server/auth");
        
        // Create a mock request for better-auth
        const loginRequest = new Request(`${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/api/auth/sign-in/email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Forward cookies from the original request
            cookie: ctx.req.headers.cookie ?? "",
          },
          body: JSON.stringify({
            email: input.email,
            password: input.password,
          }),
        });

        // Process the login
        const loginResponse = await auth.handler(loginRequest);
        const data = await loginResponse.json() as { user?: any; session?: any; error?: string };

        if (!loginResponse.ok || !data.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: data.error || "Invalid email or password",
          });
        }

        // Forward the set-cookie headers to establish the session
        const setCookieHeaders = loginResponse.headers.getSetCookie();
        if (setCookieHeaders && setCookieHeaders.length > 0 && ctx.res) {
          ctx.res.setHeader('Set-Cookie', setCookieHeaders);
        }

        // Get the user with mapping ID
        const user = await ctx.iamService.getUserByEmail(input.email);

        return {
          user: ctx.iamService.userToContract(user),
          session: data.session,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Login failed",
        });
      }
    }),

  /**
   * Get current user profile
   */
  me: protectedProcedure
    .use(iamServiceMiddleware)
    .query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }
      const user = await ctx.iamService.getCurrentUser(ctx.user.id);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }
      return ctx.iamService.userToContract(user);
    }),

  /**
   * Update user profile
   */
  updateProfile: protectedProcedure
    .use(iamServiceMiddleware)
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }
      const updatedUser = await ctx.iamService.updateProfile(
        ctx.user.id,
        input
      );
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }
    }),

  /**
   * Get user by mapping ID
   */
  getByMappingId: protectedProcedure
    .use(iamServiceMiddleware)
    .input(z.object({ mappingId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const user = await ctx.iamService.getUserByMappingId(input.mappingId);
        return ctx.iamService.userToContract(user);
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }
    }),
});