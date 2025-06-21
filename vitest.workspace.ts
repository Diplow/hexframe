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
  // Storybook test configuration for story tests
  ...(process.env.CI === 'true' ? [] : [{
    plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/writing-tests/test-addon#storybooktest
      storybookTest({ configDir: path.join(dirname, ".storybook") }),
    ],
    test: {
      name: "storybook",
      browser: {
        enabled: true,
        headless: true,
        provider: "playwright",
        instances: [{ browser: "chromium" }],
      },
      setupFiles: [".storybook/vitest.setup.ts"],
      // Workaround for Vitest 3.0 compatibility issue
      // See: https://github.com/storybookjs/storybook/issues/30308
      pool: 'forks',
      poolOptions: {
        forks: {
          singleFork: true,
        },
      },
    },
  }]),
]);
