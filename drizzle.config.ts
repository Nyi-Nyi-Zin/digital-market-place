import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./packages/server/src/schema.ts",
  out: "./drizzle/postgres",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost/cloud_nine",
  },
});
