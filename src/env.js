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
    MISTRAL_API_KEY: z.string().optional(),
    YOUTUBE_API_KEY: z.string().optional(),
    OPENROUTER_API_KEY: isTestEnv
      ? z.string().optional()
      : z.string().min(1, "OPENROUTER_API_KEY is required in non-test environments"),
    AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.string().url(),
    // Email provider API keys (optional, one should be provided in production)
    BREVO_API_KEY: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    SENDGRID_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().email().optional(),
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
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    AUTH_SECRET: process.env.AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    NEXT_PUBLIC_REQUIRE_EMAIL_VERIFICATION: process.env.NEXT_PUBLIC_REQUIRE_EMAIL_VERIFICATION,
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
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
