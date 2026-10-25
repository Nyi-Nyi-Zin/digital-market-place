import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { eq, sql } from "drizzle-orm";
import { createAuth } from "@marketplace/server/auth";
import * as schema from "@marketplace/server/schema";

const databaseURL = process.env.TEST_DATABASE_URL;
describe.skipIf(!databaseURL)(
  "Google OAuth callbacks with PostgreSQL and a mocked Google identity",
  () => {
    const namespace = `oauth_${randomUUID().replaceAll("-", "")}`;
    const control = new Pool({ connectionString: databaseURL });
    const pool = new Pool({
      connectionString: databaseURL,
      options: `-c search_path=${namespace}`,
    });
    const db = drizzle(pool, { schema });
    beforeAll(async () => {
      await control.query(`CREATE SCHEMA "${namespace}"`);
      for (const migration of readMigrationFiles({
        migrationsFolder: "drizzle/postgres",
      }))
        for (const statement of migration.sql)
          await db.execute(
            sql.raw(statement.replaceAll('"public".', `"${namespace}".`))
          );
    });
    afterAll(async () => {
      await pool.end();
      await control.query(`DROP SCHEMA "${namespace}" CASCADE`);
      await control.end();
    });

    async function fixture(
      site: "customer" | "admin",
      email: string,
      verified = true
    ) {
      const origin =
        site === "admin" ? "http://localhost:3001" : "http://localhost:3000";
      const auth = createAuth(db, {
        NODE_ENV: "test",
        MARKETPLACE_SITE: site,
        BETTER_AUTH_URL: origin,
        BETTER_AUTH_SECRET: "oauth-integration-secret-at-least-32-characters",
        GOOGLE_CLIENT_ID: "test-google-client",
        GOOGLE_CLIENT_SECRET: "test-google-secret",
      });
      const context = await auth.$context;
      // Keep the suite independent of the library's per-IP burst limit.
      // Production rate limiting stays enabled and database-backed.
      context.rateLimit.enabled = false;
      const provider = context.socialProviders[0];
      // Only the external code exchange/profile is mocked. State, PKCE, cookies,
      // account linking, sessions, signup policy and database writes are real.
      Object.assign(provider, {
        validateAuthorizationCode: async () => ({
          accessToken: "mock-token",
          scopes: ["openid", "email", "profile"],
        }),
        getUserInfo: async () => ({
          user: {
            id: `google-${email}`,
            email,
            name: "OAuth Buyer",
            emailVerified: verified,
          },
          data: { sub: `google-${email}`, email, email_verified: verified },
        }),
        accountSubject: ({ profile }: { profile: { sub: string } }) =>
          profile.sub,
      });
      async function begin(extra = {}) {
        const response = await auth.handler(
          new Request(`${origin}/api/auth/sign-in/social`, {
            method: "POST",
            headers: { "content-type": "application/json", origin },
            body: JSON.stringify({
              provider: "google",
              callbackURL: "/checkout?cart=1",
              errorCallbackURL: `${origin}/sign-in?next=%2Fcheckout`,
              ...extra,
            }),
          })
        );
        return response;
      }
      async function callback(extra = {}, query = "code=mock-code") {
        const start = await begin(extra);
        expect(start.status).toBe(200);
        const authorization = new URL((await start.json()).url);
        expect(authorization.origin).toBe("https://accounts.google.com");
        expect(authorization.searchParams.get("redirect_uri")).toBe(
          `${origin}/api/auth/callback/google`
        );
        expect(authorization.searchParams.get("code_challenge_method")).toBe(
          "S256"
        );
        expect(authorization.searchParams.get("state")).toBeTruthy();
        const cookie = start.headers
          .getSetCookie()
          .map(value => value.split(";")[0])
          .join("; ");
        return auth.handler(
          new Request(
            `${origin}/api/auth/callback/google?${query}&state=${encodeURIComponent(authorization.searchParams.get("state")!)}`,
            { headers: { cookie } }
          )
        );
      }
      async function session(response: Response) {
        const cookie = response.headers
          .getSetCookie()
          .map(value => value.split(";")[0])
          .join("; ");
        return auth.api.getSession({ headers: new Headers({ cookie }) });
      }
      return { auth, origin, begin, callback, session };
    }

    it("creates a customer identity, persists its account and restores the destination", async () => {
      const f = await fixture("customer", "new-buyer@example.test");
      const response = await f.callback();
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe("/checkout?cart=1");
      const session = await f.session(response);
      expect(session?.user.email).toBe("new-buyer@example.test");
      expect(session?.user.emailVerified).toBe(true);
      expect(response.headers.get("set-cookie")).toContain(
        "cloud-nine-customer.session_token"
      );
      const [account] = await db
        .select()
        .from(schema.authAccounts)
        .where(eq(schema.authAccounts.userId, session!.user.id));
      expect(account.providerId).toBe("google");
      const again = await f.session(await f.callback());
      expect(again?.user.id).toBe(session?.user.id);
    });

    it("links a verified existing admin identity and keeps app sessions separate", async () => {
      const id = randomUUID(),
        email = "existing-admin@example.test";
      await db
        .insert(schema.authUsers)
        .values({ id, email, name: "Admin", emailVerified: true });
      const [marketplace] = await db
        .insert(schema.users)
        .values({ openId: `auth:${id}`, authUserId: id, email, role: "admin" })
        .returning();
      const f = await fixture("admin", email);
      const response = await f.callback();
      expect((await f.session(response))?.user.id).toBe(id);
      expect(response.headers.get("set-cookie")).toContain(
        "cloud-nine-admin.session_token"
      );
      const [unchanged] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, marketplace.id));
      expect(unchanged.role).toBe("admin");
      const customer = await fixture("customer", email);
      expect(await customer.session(response)).toBeNull();
    });

    it("rejects new admin identities even when explicit signup is requested", async () => {
      const email = "uninvited-admin@example.test";
      const f = await fixture("admin", email);
      const response = await f.callback({ requestSignUp: true });
      expect(response.headers.get("location")).toContain(
        "error=signup_disabled"
      );
      expect(await f.session(response)).toBeNull();
      expect(
        await db
          .select()
          .from(schema.authUsers)
          .where(eq(schema.authUsers.email, email))
      ).toHaveLength(0);
    });

    it("refuses to link an unverified existing local account", async () => {
      const email = "unverified-local@example.test",
        id = randomUUID();
      await db
        .insert(schema.authUsers)
        .values({ id, email, name: "Local", emailVerified: false });
      const f = await fixture("customer", email);
      const response = await f.callback();
      expect(response.headers.get("location")).toContain(
        "error=account_not_linked"
      );
      expect(await f.session(response)).toBeNull();
      expect(
        await db
          .select()
          .from(schema.authAccounts)
          .where(eq(schema.authAccounts.userId, id))
      ).toHaveLength(0);
    });

    it("does not issue a session for an unverified Google email", async () => {
      const f = await fixture(
        "customer",
        "unverified-google@example.test",
        false
      );
      const response = await f.callback();
      expect(await f.session(response)).toBeNull();
      expect(response.headers.get("location")).toContain("error=");
    });

    it("returns provider cancellation to sign-in and preserves next", async () => {
      const f = await fixture("customer", "cancel@example.test");
      const response = await f.callback({}, "error=access_denied");
      const destination = new URL(response.headers.get("location")!);
      expect(destination.pathname).toBe("/sign-in");
      expect(destination.searchParams.get("next")).toBe("/checkout");
      expect(destination.searchParams.get("error")).toBe("access_denied");
      expect(await f.session(response)).toBeNull();
    });

    it("rejects forged callback state and external destinations", async () => {
      const f = await fixture("customer", "forged@example.test");
      const response = await f.auth.handler(
        new Request(
          `${f.origin}/api/auth/callback/google?code=fake&state=forged`
        )
      );
      expect(response.headers.get("location")).toContain("/sign-in?error=");
      expect(await f.session(response)).toBeNull();
      expect(
        (await f.begin({ callbackURL: "https://attacker.example/" })).status
      ).toBe(403);
      expect(
        (await f.begin({ errorCallbackURL: "https://attacker.example/" }))
          .status
      ).toBe(403);
    });
  }
);
