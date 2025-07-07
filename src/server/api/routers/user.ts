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

        // Step 3: Return combined result
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