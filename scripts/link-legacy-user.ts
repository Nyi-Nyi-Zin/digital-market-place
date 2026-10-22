import "dotenv/config";
import { Pool } from "pg";
// Explicit IDs: never infer ownership from an email supplied during sign-up.
const [legacyId, authId, confirmation] = process.argv
  .slice(2)
  .filter(arg => arg !== "--");
if (
  !/^\d+$/.test(legacyId ?? "") ||
  !authId ||
  confirmation !== "--ownership-verified"
)
  throw new Error(
    "Usage: pnpm auth:link-legacy -- <legacy-user-id> <auth-user-id> --ownership-verified"
  );
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = await pool.connect();
try {
  await db.query("BEGIN");
  const legacy = (
    await db.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [legacyId])
  ).rows[0];
  const identity = (
    await db.query(
      `SELECT * FROM auth_users WHERE id = $1 AND "emailVerified" = true`,
      [authId]
    )
  ).rows[0];
  if (!legacy || legacy.authUserId || !identity)
    throw new Error(
      "Require an unlinked legacy user and a verified auth identity"
    );
  const bridge = (
    await db.query(`SELECT * FROM users WHERE "authUserId" = $1 FOR UPDATE`, [
      authId,
    ])
  ).rows[0];
  if (bridge) {
    // Refuse merging two accounts that already own marketplace data.
    for (const table of [
      "orders",
      "payments",
      "downloads",
      "reviews",
      "wishlists",
      "notifications",
    ]) {
      const count = (
        await db.query(
          `SELECT count(*)::int AS count FROM "${table}" WHERE "userId" = $1`,
          [bridge.id]
        )
      ).rows[0].count;
      if (count)
        throw new Error(
          "The new account owns marketplace records; review and merge those records manually"
        );
    }
    await db.query(`DELETE FROM users WHERE id = $1`, [bridge.id]);
  }
  await db.query(
    `UPDATE users SET "authUserId" = $1, name = $2, email = $3, "loginMethod" = 'better-auth' WHERE id = $4`,
    [authId, identity.name, identity.email, legacy.id]
  );
  await db.query("COMMIT");
  console.log(
    "Linked verified identity to existing marketplace user",
    legacy.id
  );
} catch (error) {
  await db.query("ROLLBACK");
  throw error;
} finally {
  db.release();
  await pool.end();
}
