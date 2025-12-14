import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  // protectedProcedure, // Will use ctx.session to protect
} from "~/server/api/trpc";
import { auth } from "~/server/auth"; // Path to your betterAuth server instance
import { TRPCError } from "@trpc/server";
import { convertToHeaders } from "~/server/api/trpc"; // Import the helper
import { _throwUnauthorized, _throwInternalError } from "~/server/api/routers/_error-helpers";

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().optional(), // As per better-auth docs
        image: z.string().url().optional(), // As per better-auth docs
      }),
    )
    .mutation(async ({ input: _input, ctx: _ctx }) => {
      // better-auth server-side signUp is not explicitly in the provided basic usage.
      // Typically, client-side authClient.signUp.email is used.
      // If a server-side equivalent exists or needs to be built (e.g. for admin actions):
      // const result = await auth.api.signUpEmail({ body: { email: input.email, password: input.password, name: input.name }, asResponse: true });
      // For now, assume registration is primarily client-driven as per docs.
      // This endpoint might be more for custom backend logic post-better-auth client registration if needed.
      // Or, if better-auth handles user creation on first signIn attempt with a new email.
      // We will rely on client-side signUp for now.
      // If direct server-side registration is required, consult better-auth docs for the method.
      // For this plan, we'll assume client-side handles registration.
      throw new TRPCError({ code: "NOT_IMPLEMENTED", message: "Use client-side registration." });
    }),

  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const fetchHeaders = convertToHeaders(ctx.req.headers);
        const response = await auth.api.signInEmail({
          body: {
            email: input.email,
            password: input.password,
          },
          headers: fetchHeaders, // Pass converted headers
        });

        if (!response.user) _throwUnauthorized("Login failed: No user data returned.");
        // Return the user and token, or the whole response
        return response; // Contains user, token, redirect, url
      } catch (error) {
        _throwUnauthorized((error as Error).message || "Login failed", error);
      }
    }),

  logout: publicProcedure // Or protected if a session must exist
    .mutation(async ({ ctx }) => {
      try {
        const fetchHeaders = convertToHeaders(ctx.req.headers);
        const response = await auth.api.signOut({ 
          headers: fetchHeaders,
          asResponse: true // Get the full response to handle cookies
        });

        // Forward the Set-Cookie headers from better-auth to clear session cookies
        if (response && 'headers' in response) {
          const setCookieHeaders = response.headers.getSetCookie();
          if (setCookieHeaders && setCookieHeaders.length > 0 && ctx.res) {
            // Set the cookies in the response to clear them
            ctx.res.setHeader('Set-Cookie', setCookieHeaders);
          }
        }

        return { success: true };
      } catch (error) {
        _throwInternalError((error as Error).message || "Logout failed", error);
      }
    }),

  getSession: publicProcedure.query(async ({ ctx }) => {
    // Session from tRPC context, populated by better-auth
    return ctx.session;
  }),
});
