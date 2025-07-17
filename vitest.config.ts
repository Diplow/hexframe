import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@storybook/experimental-nextjs-vite",
      "@mdx-js/react",
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
      "**/tests/e2e/**", // Exclude E2E tests from Vitest
    ],
    env: {
      // Load .env.test file for tests
      NODE_ENV: "test",
    },
    // Run integration tests sequentially to avoid database conflicts
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Ensure proper test isolation
    isolate: true,
  },
  resolve: {
    alias: {
      "~": resolve(__dirname, "./src"),
    },
  },
});
