import { defineConfig } from "drizzle-kit";

// Use VPS_DATABASE_URL for external MySQL, fallback to DATABASE_URL
const databaseUrl = process.env.VPS_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("VPS_DATABASE_URL or DATABASE_URL must be set");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    url: databaseUrl,
  },
});