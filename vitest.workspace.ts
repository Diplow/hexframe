import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineWorkspace } from "vitest/config";

import { storybookTest } from "@storybook/experimental-addon-test/vitest-plugin";

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/writing-tests/test-addon
export default defineWorkspace([
  // Main test configuration - extending the base config
  "vitest.config.ts",
  // Storybook tests are currently disabled as we removed Playwright
  // To re-enable: install @playwright/test and uncomment below
  // ...(process.env.CI === 'true' ? [] : [{
  //   plugins: [
  //     storybookTest({ configDir: path.join(dirname, ".storybook") }),
  //   ],
  //   test: {
  //     name: "storybook",
  //     browser: {
  //       enabled: true,
  //       headless: true,
  //       provider: "playwright",
  //       instances: [{ browser: "chromium" }],
  //     },
  //     setupFiles: [".storybook/vitest.setup.ts"],
  //     pool: 'forks',
  //     poolOptions: {
  //       forks: {
  //         singleFork: true,
  //       },
  //     },
  //   },
  // }]),
]);
