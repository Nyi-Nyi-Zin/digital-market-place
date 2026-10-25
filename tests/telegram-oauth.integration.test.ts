import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { and, eq, sql } from "drizzle-orm";
import { createAuth } from "@marketplace/server/auth";
import * as schema from "@marketplace/server/schema";

const databaseURL = process.env.TEST_DATABASE_URL;
describe.skipIf(!databaseURL)(
  "Telegram OIDC with signed test tokens and PostgreSQL",
  () => {
    const namespace = `telegram_${randomUUID().replaceAll("-", "")}`;
    const control = new Pool({ connectionString: databaseURL });
    const pool = new Pool({
      connectionString: databaseURL,
      options: `-c search_path=${namespace}`,
    });
    const db = drizzle(pool, { schema });
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const jwk = {
      ...publicKey.export({ format: "jwk" }),
      kid: "test-key",
      alg: "RS256",
      use: "sig",
    };
    let claims: Record<string, unknown>;
    const json = (data: unknown) =>
      new Response(JSON.stringify(data), {
        headers: { "content-type": "application/json" },
      });

    beforeAll(async () => {
      await control.query(`CREATE SCHEMA "${namespace}"`);
      for (const migration of readMigrationFiles({
        migrationsFolder: "drizzle/postgres",
      }))
        for (const statement of migration.sql)
          await db.execute(
            sql.raw(statement.replaceAll('"public".', `"${namespace}".`))
          );
      // Exercise the actual generic OAuth implementation and its JWT verifier.
      // Only Telegram's network endpoints are replaced with a local test issuer.
      vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
        const url = String(input instanceof Request ? input.url : input);
        if (
          url === "https://oauth.telegram.org/.well-known/openid-configuration"
        )
          return json({
            issuer: "https://oauth.telegram.org",
            authorization_endpoint: "https://oauth.telegram.org/auth",
            token_endpoint: "https://oauth.telegram.org/token",
            jwks_uri: "https://oauth.telegram.org/.well-known/jwks.json",
            id_token_signing_alg_values_supported: ["RS256"],
            token_endpoint_auth_methods_supported: ["client_secret_basic"],
          });
        if (url === "https://oauth.telegram.org/.well-known/jwks.json")
          return json({ keys: [jwk] });
        if (url === "https://oauth.telegram.org/token") {
          const header = Buffer.from(
            JSON.stringify({ alg: "RS256", kid: "test-key" })
          ).toString("base64url");
          const payload = Buffer.from(JSON.stringify(claims)).toString(
            "base64url"
          );
          const unsigned = `${header}.${payload}`;
          const signature = claims.invalidSignature
            ? Buffer.from("forged-signature").toString("base64url")
            : sign("RSA-SHA256", Buffer.from(unsigned), privateKey).toString(
                "base64url"
              );
          return json({
            access_token: "test-access-token",
            token_type: "Bearer",
            expires_in: 3600,
            id_token: `${unsigned}.${signature}`,
          });
        }
        throw new Error(`Unexpected external request: ${url}`);
      });
    });
    afterAll(async () => {
      vi.unstubAllGlobals();
      await pool.end();
      await control.query(`DROP SCHEMA "${namespace}" CASCADE`);
      await control.end();
    });

    async function fixture(site: "customer" | "admin" = "customer") {
      const origin =
        site === "admin" ? "http://localhost:3001" : "http://localhost:3000";
      const auth = createAuth(db, {
        NODE_ENV: "test",
        MARKETPLACE_SITE: site,
        BETTER_AUTH_URL: origin,
        BETTER_AUTH_SECRET: "telegram-test-secret-with-at-least-32-characters",
        TELEGRAM_CLIENT_ID: "123456",
        TELEGRAM_CLIENT_SECRET: "test-secret",
      });
      (await auth.$context).rateLimit.enabled = false;
      const post = (path: string, body: object, cookie = "") =>
        auth.handler(
          new Request(`${origin}/api/auth/${path}`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              origin,
              ...(cookie ? { cookie } : {}),
            },
            body: JSON.stringify(body),
          })
        );
      const cookies = (response: Response) =>
        response.headers
          .getSetCookie()
          .map(value => value.split(";")[0])
          .join("; ");
      async function local(verified = true, role: "admin" | "user" = "user") {
        const id = randomUUID(),
          email = `${id}@example.test`;
        await db
          .insert(schema.authUsers)
          .values({ id, email, name: "Local Owner", emailVerified: verified });
        await db
          .insert(schema.users)
          .values({
            openId: `auth:${id}`,
            authUserId: id,
            email,
            name: "Local Owner",
            role,
          });
        const context = await auth.$context;
        // Sign the test session through the real email login instead of hand-writing cookies.
        await db
          .insert(schema.authAccounts)
          .values({
            id: randomUUID(),
            userId: id,
            providerId: "credential",
            accountId: id,
            password: await context.password.hash(
              "test-password-at-least-12-characters"
            ),
          });
        const response = await post("sign-in/email", {
          email,
          password: "test-password-at-least-12-characters",
        });
        expect(response.status).toBe(200);
        return { id, email, cookie: cookies(response) };
      }
      async function callback(
        subject: string,
        cookie = "",
        overrides: Record<string, unknown> = {},
        link = false
      ) {
        const start = await post(
          link ? "link-social" : "sign-in/social",
          {
            provider: "telegram",
            callbackURL: "/account",
            errorCallbackURL: `${origin}/sign-in?oauth=telegram`,
          },
          cookie
        );
        expect(start.status).toBe(200);
        const authorization = new URL((await start.json()).url);
        expect(authorization.origin).toBe("https://oauth.telegram.org");
        expect(authorization.searchParams.get("redirect_uri")).toBe(
          `${origin}/api/auth/callback/telegram`
        );
        expect(authorization.searchParams.get("code_challenge_method")).toBe(
          "S256"
        );
        expect(authorization.searchParams.get("scope")).toBe("openid profile");
        expect(authorization.searchParams.get("nonce")).toBeTruthy();
        const now = Math.floor(Date.now() / 1000);
        claims = {
          iss: "https://oauth.telegram.org",
          aud: "123456",
          sub: subject,
          iat: now,
          exp: now + 3600,
          nonce: authorization.searchParams.get("nonce"),
          name: "Telegram Name",
          preferred_username: "mutable-name",
          ...overrides,
        };
        return auth.handler(
          new Request(
            `${origin}/api/auth/callback/telegram?code=test-code&state=${encodeURIComponent(authorization.searchParams.get("state")!)}`,
            {
              headers: {
                cookie: [cookie, cookies(start)].filter(Boolean).join("; "),
              },
            }
          )
        );
      }
      return { auth, post, local, callback, cookies };
    }

    it("requires an authenticated session to connect Telegram", async () => {
      const f = await fixture();
      expect(
        (
          await f.post("link-social", {
            provider: "telegram",
            callbackURL: "/account",
          })
        ).status
      ).toBe(401);
    });

    it("links once, signs in with the same identity, and preserves email and role", async () => {
      const f = await fixture("admin"),
        owner = await f.local(true, "admin");
      const linked = await f.callback("111111", owner.cookie, {}, true);
      expect(linked.headers.get("location")).toBe("/account");
      const [account] = await db
        .select()
        .from(schema.authAccounts)
        .where(
          and(
            eq(schema.authAccounts.providerId, "telegram"),
            eq(schema.authAccounts.accountId, "111111")
          )
        );
      expect(account.userId).toBe(owner.id);
      const signedIn = await f.callback("111111");
      const session = await f.auth.api.getSession({
        headers: new Headers({ cookie: f.cookies(signedIn) }),
      });
      expect(session?.user.id).toBe(owner.id);
      expect(session?.user.email).toBe(owner.email);
      expect(session?.user.name).toBe("Local Owner");
      const [marketplace] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.authUserId, owner.id));
      expect(marketplace.role).toBe("admin");
      expect(signedIn.headers.get("set-cookie")).toContain(
        "cloud-nine-admin.session_token"
      );
      const customer = await fixture("customer");
      expect(
        await customer.auth.api.getSession({
          headers: new Headers({ cookie: f.cookies(signedIn) }),
        })
      ).toBeNull();
      const customerResponse = await customer.callback("111111");
      expect(
        (
          await customer.auth.api.getSession({
            headers: new Headers({
              cookie: customer.cookies(customerResponse),
            }),
          })
        )?.user.id
      ).toBe(owner.id);
    });

    it("does not register or implicitly link an unknown Telegram identity by email", async () => {
      const f = await fixture(),
        owner = await f.local();
      const response = await f.callback("222222", "", {
        email: owner.email,
        email_verified: true,
      });
      expect(response.headers.get("location")).toContain(
        "error=email_not_found"
      );
      expect(
        await f.auth.api.getSession({
          headers: new Headers({ cookie: f.cookies(response) }),
        })
      ).toBeNull();
      expect(
        await db
          .select()
          .from(schema.authAccounts)
          .where(eq(schema.authAccounts.accountId, "222222"))
      ).toHaveLength(0);
    });

    it("refuses to connect Telegram to an unverified local email", async () => {
      const f = await fixture(),
        owner = await f.local(false);
      const response = await f.callback("333333", owner.cookie, {}, true);
      expect(response.headers.get("location")).toContain("error=");
      expect(
        await db
          .select()
          .from(schema.authAccounts)
          .where(eq(schema.authAccounts.accountId, "333333"))
      ).toHaveLength(0);
    });

    it("refuses to reassign a connected Telegram identity to another account", async () => {
      const f = await fixture(),
        owner = await f.local(),
        other = await f.local();
      expect(
        (await f.callback("444444", owner.cookie, {}, true)).headers.get(
          "location"
        )
      ).toBe("/account");
      expect(
        (await f.callback("444444", other.cookie, {}, true)).headers.get(
          "location"
        )
      ).toContain("error=account_already_linked_to_different_user");
      const [account] = await db
        .select()
        .from(schema.authAccounts)
        .where(eq(schema.authAccounts.accountId, "444444"));
      expect(account.userId).toBe(owner.id);
    });

    for (const [name, invalid] of Object.entries({
      signature: { invalidSignature: true },
      audience: { aud: "wrong-client" },
      issuer: { iss: "https://attacker.example" },
      expiry: { exp: 1 },
      nonce: { nonce: "wrong-nonce" },
    })) {
      it(`rejects a signed token with invalid ${name}`, async () => {
        const f = await fixture(),
          owner = await f.local();
        const subject = `invalid-${name}`;
        const response = await f.callback(subject, owner.cookie, invalid, true);
        expect(response.headers.get("location")).toContain("error=");
        expect(
          await db
            .select()
            .from(schema.authAccounts)
            .where(eq(schema.authAccounts.accountId, subject))
        ).toHaveLength(0);
      });
    }
  }
);
