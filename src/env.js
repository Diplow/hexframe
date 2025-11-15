import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Determine if we're in a test environment
const isTestEnv = process.env.NODE_ENV === "test" || process.env.VITEST;

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: isTestEnv ? z.string().url().optional() : z.string().url(),
    TEST_DATABASE_URL: z.string().url().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    // LLM Provider configuration
    LLM_PROVIDER: z.enum(["openrouter", "claude-agent-sdk"]).default("openrouter"),
    OPENROUTER_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    GENERATE_PREVIEW_MODEL: z.string().default("gpt-4o-mini"),
    USE_SANDBOX: z.enum(["true", "false"]).optional(), // Enable Vercel Sandbox for Claude Agent SDK
    USE_ANTHROPIC_PROXY: z.enum(["true", "false"]).optional(), // Use Anthropic proxy (for testing without sandbox)
    VERCEL_OIDC_TOKEN: z.string().optional(), // Vercel OIDC token for Sandbox API (from vercel env pull)
    INTERNAL_PROXY_SECRET: z.string().optional(), // Secret for authenticating internal proxy requests
    AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.string().url().optional(),
    VERCEL_URL: z.string().optional(), // Vercel system variable
    // Email provider API keys (optional, one should be provided in production)
    BREVO_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().email().optional(),
    // Inngest configuration
    INNGEST_EVENT_KEY: z.string().optional(),
    INNGEST_SIGNING_KEY: z.string().optional(),
    USE_QUEUE: z.enum(["true", "false"]).optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_BETTER_AUTH_URL: z.string().url().optional(),
    NEXT_PUBLIC_REQUIRE_EMAIL_VERIFICATION: z
      .enum(["true", "false"])
      .default("false")
      .transform((val) => val === "true"),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
    LLM_PROVIDER: process.env.LLM_PROVIDER,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GENERATE_PREVIEW_MODEL: process.env.GENERATE_PREVIEW_MODEL,
    USE_SANDBOX: process.env.USE_SANDBOX,
    USE_ANTHROPIC_PROXY: process.env.USE_ANTHROPIC_PROXY,
    VERCEL_OIDC_TOKEN: process.env.VERCEL_OIDC_TOKEN,
    INTERNAL_PROXY_SECRET: process.env.INTERNAL_PROXY_SECRET,
    AUTH_SECRET: process.env.AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    NEXT_PUBLIC_REQUIRE_EMAIL_VERIFICATION: process.env.NEXT_PUBLIC_REQUIRE_EMAIL_VERIFICATION,
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
    INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
    USE_QUEUE: process.env.USE_QUEUE,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});

/**
 * Get the auth URL, falling back to VERCEL_URL if BETTER_AUTH_URL is not set
 * This is useful for preview deployments where we want to use the deployment URL
 */
export function getAuthUrl() {
  if (env.BETTER_AUTH_URL) {
    return env.BETTER_AUTH_URL;
  }

  // Vercel preview deployments
  if (env.VERCEL_URL) {
    return `https://${env.VERCEL_URL}`;
  }

  // Local development fallback
  return "http://localhost:3000";
}
