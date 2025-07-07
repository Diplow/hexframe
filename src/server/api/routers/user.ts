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
        // Use better-auth API directly
        const { auth } = await import("~/server/auth");
        const { convertToHeaders } = await import("~/server/api/trpc");
        
        // Convert headers for better-auth
        const fetchHeaders = convertToHeaders(ctx.req.headers);
        
        // Use the same approach as the auth router
        const response = await auth.api.signInEmail({
          body: {
            email: input.email,
            password: input.password,
          },
          headers: fetchHeaders,
          asResponse: true, // Get full response to handle cookies
        });

        // Check if response is a Response object
        let data: any;
        if (response instanceof Response) {
          // Handle the response and forward cookies
          const setCookieHeaders = response.headers.getSetCookie();
          console.log("[LOGIN] Response headers:", {
            setCookieHeaders,
            setCookieCount: setCookieHeaders?.length,
            hasCtxRes: !!ctx.res,
          });
          if (setCookieHeaders && setCookieHeaders.length > 0 && ctx.res) {
            ctx.res.setHeader('Set-Cookie', setCookieHeaders);
            console.log("[LOGIN] Set-Cookie headers forwarded successfully");
          }
          data = await response.json();
        } else {
          data = response;
          console.log("[LOGIN] Response is not a Response object:", typeof response);
        }

        console.log("[LOGIN] Response data:", {
          hasUser: !!data.user,
          userId: data.user?.id,
          userEmail: data.user?.email,
          hasSession: !!data.session,
          sessionId: data.session?.id,
        });

        if (!data.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED", 
            message: "Invalid email or password",
          });
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