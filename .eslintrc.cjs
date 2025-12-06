// @ts-nocheck
/** @type {import("eslint").Linter.Config} */
const config = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
  plugins: ["@typescript-eslint", "drizzle", "import"],
  extends: [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
  ],
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: "./tsconfig.json"
      },
      alias: {
        map: [
          ["~", "./src"]
        ],
        extensions: [".js", ".jsx", ".ts", ".tsx"]
      }
    }
  },
  overrides: [
    {
      files: ["src/lib/debug/**/*.ts"],
      rules: {
        "@typescript-eslint/no-base-to-string": "off",
        "@typescript-eslint/restrict-template-expressions": "off",
      },
    },
    {
      files: ["**/__tests__/**/*.ts", "**/*.test.ts"],
      rules: {
        "@typescript-eslint/unbound-method": "off",
      },
    },
    {
      // Files that use MapCache have false positive unsafe assignment warnings
      // due to ESLint not properly following the barrel export pattern
      files: [
        "src/app/map/Canvas/**/*.ts",
        "src/app/map/Canvas/**/*.tsx",
        "src/app/map/Hierarchy/**/*.tsx",
        "src/app/map/Tile/**/*.tsx",
        "src/app/map/_components/**/*.tsx",
        "src/app/map/_hooks/**/*.tsx"
      ],
      rules: {
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unsafe-return": "off",
      },
    },
    {
      // SECURITY: Restrict drizzle-orm imports to infrastructure layer only.
      // This ensures all database queries go through domain repositories,
      // which enforce visibility filtering via RequesterContext.
      // Allowed locations:
      // - src/server/db/** - Schema definitions and connection
      // - src/lib/domains/*/infrastructure/** - Repository implementations
      // - src/lib/domains/*/types/** - Type definitions (type-only imports allowed)
      // - drizzle/** - Migration files
      // - scripts/** - Utility scripts
      // - **/__tests__/** - Test files
      files: ["src/**/*.ts", "src/**/*.tsx"],
      excludedFiles: [
        "src/server/db/**",
        "src/server/api/routers/**", // TODO: Refactor to use repositories
        "src/lib/domains/*/infrastructure/**",
        "src/lib/domains/**/infrastructure/**",
        "src/lib/domains/*/types/**",
        "src/lib/domains/**/types/**",
        "src/lib/domains/*/services/**", // TODO: Refactor to use repositories
        "src/lib/domains/**/services/**", // TODO: Refactor to use repositories
        "**/__tests__/**",
        "**/*.test.ts",
        "**/*.integration.test.ts"
      ],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "drizzle-orm",
                message: "Direct drizzle-orm imports are restricted to infrastructure layer. Use domain repositories instead to ensure visibility filtering."
              },
              {
                name: "drizzle-orm/pg-core",
                message: "Direct drizzle-orm imports are restricted to infrastructure layer. Use domain repositories instead to ensure visibility filtering."
              }
            ],
            patterns: [
              {
                group: ["../*", "./*"],
                message: "Relative imports are not allowed. Use absolute imports with '~/' prefix instead."
              },
              {
                group: ["drizzle-orm/*"],
                message: "Direct drizzle-orm imports are restricted to infrastructure layer. Use domain repositories instead to ensure visibility filtering."
              }
            ]
          }
        ]
      }
    },
  ],
  rules: {
    "@typescript-eslint/array-type": "off",
    "@typescript-eslint/consistent-type-definitions": "off",
    "@typescript-eslint/consistent-type-imports": [
      "warn",
      {
        prefer: "type-imports",
        fixStyle: "inline-type-imports",
      },
    ],
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/no-misused-promises": [
      "error",
      {
        checksVoidReturn: {
          attributes: false,
        },
      },
    ],
    "drizzle/enforce-delete-with-where": [
      "error",
      {
        drizzleObjectName: ["db", "ctx.db"],
      },
    ],
    "drizzle/enforce-update-with-where": [
      "error",
      {
        drizzleObjectName: ["db", "ctx.db"],
      },
    ],
    // Custom rule to warn about direct color usage
    "no-restricted-syntax": [
      "warn",
      {
        selector: "Literal[value=/\\b(text|bg|border|ring|fill)-(slate|gray|zinc|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}\\b/]",
        message: "Use semantic colors from the design system instead of direct Tailwind colors. Replace with primary, secondary, success, link, destructive, or neutral."
      }
    ],
    // Use no-restricted-imports to forbid relative imports but allow ~ imports
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["../*", "./*"],
            message: "Relative imports are not allowed. Use absolute imports with '~/' prefix instead."
          }
        ]
      }
    ]
  },
};

module.exports = config;