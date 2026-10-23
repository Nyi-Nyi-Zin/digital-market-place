import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
const globalDatabase = globalThis as typeof globalThis & {
  marketplacePool?: Pool;
};
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;
export function getDb() {
  if (database) return database;
  const url = process.env.DATABASE_URL;
  if (!url || !/^postgres(ql)?:\/\//.test(url))
    throw new Error("DATABASE_URL must be a PostgreSQL connection URL");
  const pool =
    globalDatabase.marketplacePool ??
    new Pool({ connectionString: url, max: 5 });
  if (process.env.NODE_ENV !== "production")
    globalDatabase.marketplacePool = pool;
  database = drizzle(pool, { schema });
  return database;
}
