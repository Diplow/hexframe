import { config } from "dotenv";
import { resolve } from "path";

// Load test environment variables before anything else
const envPath = resolve(process.cwd(), ".env.test");
config({ path: envPath });

// Log that we've loaded the test environment
console.log("Loaded test environment from:", envPath);