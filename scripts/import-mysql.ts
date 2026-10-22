import "dotenv/config";
import mysql from "mysql2/promise";
import { Pool } from "pg";
if (!process.env.LEGACY_MYSQL_URL || !process.env.DATABASE_URL)
  throw new Error("Set LEGACY_MYSQL_URL and the new PostgreSQL DATABASE_URL");
// Run while the old application is in maintenance mode. Source connection is read-only.
const source = await mysql.createConnection(process.env.LEGACY_MYSQL_URL);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const target = await pool.connect();
const tables = [
  "users",
  "categories",
  "products",
  "orders",
  "order_items",
  "payment_methods",
  "payments",
  "downloads",
  "reviews",
  "wishlists",
  "notifications",
];
const booleanColumns = new Set(["enabled", "featured", "read"]);
try {
  await source.query("SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ");
  await source.query("START TRANSACTION READ ONLY, WITH CONSISTENT SNAPSHOT");
  await target.query("BEGIN");
  // Keep this a one-time import into a freshly migrated target.
  for (const table of [
    ...tables,
    "auth_users",
    "auth_sessions",
    "auth_accounts",
    "auth_verifications",
  ]) {
    if (
      (await target.query(`SELECT count(*)::int AS count FROM "${table}"`))
        .rows[0].count
    )
      throw new Error(`Target table ${table} is not empty; import aborted`);
  }
  for (const table of tables) {
    const [rows] = await source.query<mysql.RowDataPacket[]>(
      `SELECT * FROM \`${table}\` ORDER BY id`
    );
    const columns = new Set(
      (
        await target.query(
          "SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1",
          [table]
        )
      ).rows.map(row => row.column_name)
    );
    for (const row of rows) {
      const keys = Object.keys(row).filter(key => columns.has(key));
      const values = keys.map(key =>
        booleanColumns.has(key) ? Boolean(row[key]) : row[key]
      );
      await target.query(
        `INSERT INTO "${table}" (${keys.map(key => `"${key}"`).join(",")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(",")})`,
        values
      );
    }
    await target.query(
      `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT max(id) FROM "${table}"), 1), EXISTS(SELECT 1 FROM "${table}"))`,
      [table]
    );
    const actual = (
      await target.query(`SELECT count(*)::int AS count FROM "${table}"`)
    ).rows[0].count;
    if (actual !== rows.length)
      throw new Error(`Row count mismatch for ${table}`);
    console.log(table, actual, "rows imported");
  }
  await target.query("COMMIT");
  await source.query("COMMIT");
  console.log(
    "Import complete. Existing numeric IDs are preserved. Link verified auth identities separately."
  );
} catch (error) {
  await target.query("ROLLBACK");
  await source.query("ROLLBACK");
  throw error;
} finally {
  target.release();
  await pool.end();
  await source.end();
}
