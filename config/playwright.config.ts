import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// Load test environment variables
dotenv.config({ path: ".env.test" });

// Set DATABASE_URL from TEST_DATABASE_URL for E2E tests
if (process.env.NODE_ENV === "test" && process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

// NODE_ENV will be set in the environment

// For offline UI tests, we use a static port for simplicity
const port = process.env.NEXT_PUBLIC_URL ? new URL(process.env.NEXT_PUBLIC_URL).port : "3000";
const baseURL = process.env.NEXT_PUBLIC_URL || `http://localhost:${port}`;

// Determine if we're in AI parsing mode
const isAIParsing = process.env.AI_PARSING === 'true';

// Configure reporters based on mode
const getReporter = (): any => {
  if (isAIParsing) {
    return [['json', { outputFile: '../test-results/playwright-results.json' }]];
  }
  return process.env.CI
    ? [["html", { open: "never" }], ["list"]]
    : [["html", { open: "on-failure" }]];
};

export default defineConfig({
  testDir: "../tests/e2e",
  testMatch: "**/*.spec.ts",
  timeout: 60 * 1000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: getReporter(),
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Don't set browser offline - we'll use URL params and localStorage
    extraHTTPHeaders: {
      'X-Offline-Mode': 'true',
    },
  },

  projects: [
    // Dynamic mode (JavaScript enabled) - Default and only project for efficiency
    {
      name: "dynamic-chromium",
      use: {
        ...devices["Desktop Chrome"],
        javaScriptEnabled: true,
      },
    },
    // Commented out for efficiency - uncomment if needed for specific testing
    // {
    //   name: "static-chromium",
    //   use: {
    //     ...devices["Desktop Chrome"],
    //     javaScriptEnabled: false,
    //   },
    // },
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },
  ],

  // No webServer needed for offline tests - we assume dev server is already running
  // Users should run `pnpm dev` before running tests

  outputDir: "test-results/",
});