#!/usr/bin/env tsx

import { readdir, rmdir, unlink } from "fs/promises";
import { existsSync, readFileSync } from "fs";
import path from "path";
import postgres from "postgres";
import { execSync } from "child_process";
import readline from "readline";

// Colors for console output
const colors = {
  rose: "\x1b[31m",
  green: "\x1b[32m",
  amber: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  reset: "\x1b[0m",
  bright: "\x1b[1m",
};

const log = {
  error: (msg: string) => console.log(`${colors.rose}❌ ${msg}${colors.reset}`),
  success: (msg: string) =>
    console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg: string) =>
    console.log(`${colors.amber}⚠️  ${msg}${colors.reset}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  step: (msg: string) => console.log(`${colors.cyan}🔄 ${msg}${colors.reset}`),
};

async function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `${colors.amber}${question} (y/N): ${colors.reset}`,
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
      },
    );
  });
}

async function getDatabaseUrl(): Promise<string> {
  // Load environment variables
  const envPath = path.join(process.cwd(), ".env");
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf8");
    const envVars = envContent.split("\n").reduce(
      (acc, line) => {
        const [key, value] = line.split("=");
        if (key && value) {
          acc[key.trim()] = value.trim().replace(/^["']|["']$/g, "");
        }
        return acc;
      },
      {} as Record<string, string>,
    );

    if (envVars.TEST_DATABASE_URL) {
      return envVars.TEST_DATABASE_URL;
    }
  }

  throw new Error("TEST_DATABASE_URL not found in .env file");
}

function getTablePrefixFromUrl(databaseUrl: string): string {
  try {
    // Extract database name from URL (part after the last '/')
    const url = new URL(databaseUrl);
    const dbName = url.pathname.substring(1); // Remove leading '/'
    return dbName ? `${dbName}_` : "vde_"; // Fallback to vde_ if no db name found
  } catch (error) {
    log.warning(
      `Failed to parse database URL, using default prefix 'vde_': ${error}`,
    );
    return "vde_";
  }
}

async function dropAllTables(
  client: ReturnType<typeof postgres>,
  tablePrefix: string,
) {
  log.step(`Dropping all tables with prefix '${tablePrefix}'...`);

  try {
    // First, drop all constraints to avoid dependency issues
    const constraints = await client`
      SELECT conname, conrelid::regclass AS table_name
      FROM pg_constraint 
      WHERE connamespace = 'public'::regnamespace
      AND conrelid::regclass::text LIKE ${tablePrefix + "%"}
    `;

    for (const constraint of constraints) {
      try {
        await client`ALTER TABLE ${client(constraint.table_name)} DROP CONSTRAINT IF EXISTS ${client(constraint.conname)} CASCADE`;
      } catch (err) {
        // Ignore errors for constraints that don't exist
        log.info(
          `Skipped constraint ${constraint.conname} (already dropped or doesn't exist)`,
        );
      }
    }

    // Get all table names with the dynamic prefix
    const tables = await client`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename LIKE ${tablePrefix + "%"}
    `;

    if (tables.length === 0) {
      log.info(`No tables with prefix '${tablePrefix}' found`);
    } else {
      // Drop tables with CASCADE to handle any remaining foreign key constraints
      for (const table of tables) {
        await client`DROP TABLE IF EXISTS ${client(table.tablename)} CASCADE`;
        log.info(`Dropped table: ${table.tablename}`);
      }
    }

    // Also drop the drizzle migrations table if it exists
    await client`DROP TABLE IF EXISTS "__drizzle_migrations" CASCADE`;
    log.info("Dropped drizzle migrations table");

    // Drop any sequences that might be left over
    const sequences = await client`
      SELECT sequencename 
      FROM pg_sequences 
      WHERE schemaname = 'public' 
      AND sequencename LIKE ${tablePrefix + "%"}
    `;

    for (const sequence of sequences) {
      await client`DROP SEQUENCE IF EXISTS ${client(sequence.sequencename)} CASCADE`;
      log.info(`Dropped sequence: ${sequence.sequencename}`);
    }

    log.success("All tables, constraints, and sequences dropped successfully");
  } catch (error) {
    log.error(`Failed to drop tables: ${error}`);
    throw error;
  }
}

async function clearMigrationsFolder() {
  log.step("Clearing migrations folder...");

  const migrationsPath = path.join(process.cwd(), "drizzle", "migrations");

  if (!existsSync(migrationsPath)) {
    log.info("Migrations folder does not exist");
    return;
  }

  try {
    const files = await readdir(migrationsPath);

    for (const file of files) {
      const filePath = path.join(migrationsPath, file);
      if (file.endsWith(".sql") || file === "meta") {
        if (file === "meta") {
          // Remove meta directory and its contents
          const metaFiles = await readdir(filePath);
          for (const metaFile of metaFiles) {
            await unlink(path.join(filePath, metaFile));
          }
          await rmdir(filePath);
        } else {
          await unlink(filePath);
        }
        log.info(`Removed: ${file}`);
      }
    }

    log.success("Migrations folder cleared");
  } catch (error) {
    log.error(`Failed to clear migrations: ${error}`);
    throw error;
  }
}

async function recreateSchema() {
  log.step("Recreating schema from scratch...");

  try {
    // Use drizzle-kit push with --force and make it non-interactive
    // Show output so user can see what's happening
    execSync("npx drizzle-kit push --force --yes", {
      cwd: process.cwd(),
      stdio: "inherit", // Show output to user
    });

    log.success("Schema recreated successfully");
  } catch (error) {
    log.warning("Force push with --yes failed, trying interactive mode...");
    try {
      // If --yes doesn't work, try regular push with interactive mode
      log.info("You may need to confirm the changes when prompted:");
      execSync("npx drizzle-kit push", {
        cwd: process.cwd(),
        stdio: "inherit", // Show output and allow user interaction
      });
      log.success("Schema recreated successfully");
    } catch (fallbackError) {
      log.error(`Failed to recreate schema: ${fallbackError}`);
      log.info(
        "You may need to manually run 'npx drizzle-kit push' after the script completes",
      );
      throw fallbackError;
    }
  }
}

async function main() {
  console.log(
    `${colors.bright}${colors.rose}🗑️  DATABASE DELETION SCRIPT${colors.reset}\n`,
  );

  try {
    // Get database connection and table prefix info early
    const databaseUrl = await getDatabaseUrl();
    const tablePrefix = getTablePrefixFromUrl(databaseUrl);

    log.warning("This script will:");
    console.log(`  • Drop all tables with prefix '${tablePrefix}'`);
    console.log("  • Clear all drizzle migrations");
    console.log("  • Recreate schema from current code");
    console.log("  • ALL DATA WILL BE LOST PERMANENTLY\n");

    log.info(`Database: ${databaseUrl.replace(/\/\/.*~/, "//***:***@")}`); // Hide credentials
    log.info(`Table prefix: ${tablePrefix}\n`);

    // First confirmation
    const confirmed = await askConfirmation(
      "Are you sure you want to delete the database?",
    );
    if (!confirmed) {
      log.info("Database deletion cancelled");
      process.exit(0);
    }

    // Second confirmation for extra safety
    const doubleConfirmed = await askConfirmation(
      "This action is IRREVERSIBLE. Are you absolutely sure?",
    );
    if (!doubleConfirmed) {
      log.info("Database deletion cancelled");
      process.exit(0);
    }

    // Get database connection
    const client = postgres(databaseUrl);

    // Execute deletion steps
    await dropAllTables(client, tablePrefix);
    await clearMigrationsFolder();
    await recreateSchema();

    // Close database connection
    await client.end();

    console.log("\n" + "=".repeat(50));
    log.success("Database deletion and recreation completed successfully!");
    log.info("You can now run your application with a fresh database");
    console.log("=".repeat(50) + "\n");
  } catch (error) {
    log.error(`Script failed: ${error}`);
    process.exit(1);
  }
}

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n");
  log.warning("Script interrupted by user");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n");
  log.warning("Script terminated");
  process.exit(0);
});

main().catch((error) => {
  log.error(`Unhandled error: ${error}`);
  process.exit(1);
});
