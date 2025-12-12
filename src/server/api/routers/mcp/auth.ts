import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure, convertToHeaders } from "~/server/api/trpc";
import { auth } from "~/server/auth";
import { _throwUnauthorized, _throwBadRequest, _throwInternalError } from "~/server/api/routers/_error-helpers";

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
        // Use better-auth's signInEmail to verify credentials

        try {
          await auth.api.signInEmail({
            body: {
              email: ctx.user.email,
              password: input.password,
            },
          });

          // If we get here without error, the password is correct
        } catch (passwordError) {
          console.error("🔑 Password verification failed:", passwordError);
          _throwUnauthorized("Invalid password. Please enter your current password.");
        }
        
        // Password verified successfully, proceed with key creation
        const createKeyPayload = {
          userId: ctx.user.id,
          name: input.name,
          ...(input.expiresAt && { expiresIn: Math.floor((input.expiresAt.getTime() - Date.now()) / 1000) }),
          // Add metadata to track this is for MCP usage
          metadata: {
            purpose: "mcp",
            createdVia: "hexframe-ui",
          },
        };

        const result = await auth.api.createApiKey({
          body: createKeyPayload,
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

        // Extract better-auth specific error messages
        if (error && typeof error === 'object' && 'body' in error) {
          const apiError = error as { body?: { message?: string } };
          if (apiError.body?.message) _throwBadRequest(apiError.body.message);
        }

        // Extract error message from Error objects
        _throwInternalError(error instanceof Error ? error.message : "Failed to create API key");
      }
    }),

  // List user's API keys (protected)
  listKeys: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        // Try using the same headers approach as tRPC context creation
        const sessionHeaders = ctx.req.headers instanceof Headers 
          ? ctx.req.headers 
          : convertToHeaders(ctx.req.headers);
        
        try {
          const result = await auth.api.listApiKeys({
            headers: sessionHeaders
          });
          
          // Filter to show only MCP keys for this user and exclude the raw key value  
          const filteredKeys = result.filter((key) => {
            try {
              // Handle metadata based on its actual type
              let metadata: { purpose?: string } = {};
              
              if (typeof key.metadata === 'string') {
                try {
                  metadata = JSON.parse(key.metadata) as { purpose?: string };
                } catch {
                  metadata = {};
                }
              } else if (key.metadata && typeof key.metadata === 'object') {
                metadata = key.metadata as { purpose?: string };
              }
              
              const isUserKey = key.userId === ctx.user.id;
              const isMcpKey = metadata?.purpose === "mcp";
              return isUserKey && isMcpKey;
            } catch {
              return false;
            }
          });

          return filteredKeys.map((key) => ({
            id: key.id,
            name: key.name,
            createdAt: new Date(key.createdAt),
            expiresAt: key.expiresAt ? new Date(key.expiresAt) : null,
            enabled: key.enabled ?? true,
          }));
          
        } catch (betterAuthError) {
          console.error("🔑 better-auth listApiKeys failed:", betterAuthError);
          // For now, return empty array if better-auth fails
          return [];
        }
      } catch (error) {
        console.error("🔑 Failed to list API keys:", error);
        _throwInternalError(`Failed to list API keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Revoke an API key (protected)
  revokeKey: protectedProcedure
    .input(revokeKeySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Use the same headers approach as listKeys (which works)
        const sessionHeaders = ctx.req.headers instanceof Headers 
          ? ctx.req.headers 
          : convertToHeaders(ctx.req.headers);
        
        await auth.api.deleteApiKey({
          body: {
            keyId: input.keyId,
          },
          headers: sessionHeaders
        });
        
        return { success: true };
      } catch (error) {
        console.error("Failed to revoke API key:", error);
        _throwInternalError("Failed to revoke API key");
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