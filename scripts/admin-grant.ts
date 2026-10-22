import "dotenv/config";
import { Pool } from "pg";
const email = process.argv
  .slice(2)
  .filter(arg => arg !== "--")[0]
  ?.trim()
  .toLowerCase();
if (!email)
  throw new Error("Usage: pnpm admin:grant -- verified-admin@example.com");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = await pool.connect();
try {
  await db.query("BEGIN");
  const result = await db.query(
    `UPDATE users SET role = 'admin' WHERE "authUserId" IN (SELECT id FROM auth_users WHERE lower(email) = $1 AND "emailVerified" = true) RETURNING id`,
    [email]
  );
  if (result.rowCount !== 1)
    throw new Error(
      "Expected one verified account that has signed in to the marketplace. No role changed."
    );
  await db.query("COMMIT");
  console.log(
    "Administrator role granted to marketplace user",
    result.rows[0].id
  );
} catch (error) {
  await db.query("ROLLBACK");
  throw error;
} finally {
  db.release();
  await pool.end();
}
