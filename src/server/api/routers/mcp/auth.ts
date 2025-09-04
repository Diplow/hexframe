import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { auth } from "~/server/auth";
import { TRPCError } from "@trpc/server";

const createKeySchema = z.object({
  name: z.string().min(1, "Key name is required").max(100, "Key name too long"),
  expiresAt: z.date().optional(),
  password: z.string().min(1, "Password is required for key creation"),
});

const revokeKeySchema = z.object({
  keyId: z.string().min(1, "Key ID is required"),
});

const validateKeySchema = z.object({
  key: z.string().min(1, "API key is required"),
});

export const mcpAuthRouter = createTRPCRouter({
  // Create a new API key (protected - requires authentication)
  createKey: protectedProcedure
    .input(createKeySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify user password before creating key
        // Note: better-auth doesn't expose password verification directly
        // We'll need to implement this verification
        
        // For now, let's create the key and handle password verification later
        const result = await auth.api.createApiKey({
          body: {
            userId: ctx.user.id,
            name: input.name,
            ...(input.expiresAt && { expiresIn: Math.floor((input.expiresAt.getTime() - Date.now()) / 1000) }),
            // Add metadata to track this is for MCP usage
            metadata: {
              purpose: "mcp",
              createdVia: "hexframe-ui",
            },
          },
        });
        
        return {
          keyId: result.id,
          key: result.key, // This will only be returned once
          name: result.name,
          createdAt: result.createdAt,
          expiresAt: result.expiresAt,
        };
      } catch (error) {
        console.error("Failed to create API key:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create API key",
        });
      }
    }),

  // List user's API keys (protected)
  listKeys: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const result = await auth.api.listApiKeys({
          headers: new Headers({
            'cookie': ctx.req?.headers.cookie ?? '',
          })
        });
        
        // Filter to show only MCP keys for this user and exclude the raw key value  
        return result.filter((key) => {
          try {
            const metadata = JSON.parse(key.metadata ?? '{}') as { purpose?: string };
            return key.userId === ctx.user.id && metadata?.purpose === "mcp";
          } catch {
            return false;
          }
        }).map((key) => ({
          id: key.id,
          name: key.name,
          createdAt: key.createdAt,
          expiresAt: key.expiresAt,
          enabled: key.enabled,
        }));
      } catch (error) {
        console.error("Failed to list API keys:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list API keys",
        });
      }
    }),

  // Revoke an API key (protected)
  revokeKey: protectedProcedure
    .input(revokeKeySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await auth.api.deleteApiKey({
          body: {
            keyId: input.keyId,
          },
          headers: new Headers({
            'cookie': ctx.req?.headers.cookie ?? '',
          })
        });
        
        return { success: true };
      } catch (error) {
        console.error("Failed to revoke API key:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to revoke API key",
        });
      }
    }),

  // Validate API key (public - used by MCP server)
  validateKey: publicProcedure
    .input(validateKeySchema)
    .query(async ({ input }) => {
      try {
        const result = await auth.api.verifyApiKey({
          body: {
            key: input.key,
          },
        });
        
        if (!result.valid) {
          return {
            valid: false,
            userId: null,
          };
        }
        
        return {
          valid: true,
          userId: result.key?.userId ?? null,
          keyId: result.key?.id ?? null,
        };
      } catch (error) {
        console.error("Failed to validate API key:", error);
        return {
          valid: false,
          userId: null,
        };
      }
    }),
});