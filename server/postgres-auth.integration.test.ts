import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { sql } from "drizzle-orm";
import {
  ensureMarketplaceUser,
  createOrder,
  createPayment,
  setPaymentStatus,
  getDb,
} from "./db";
import { eq } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import { createAuth } from "./auth";

// Opt-in isolated schema. Never use DATABASE_URL for destructive test setup.
const databaseURL = process.env.TEST_DATABASE_URL;
describe.skipIf(!databaseURL)("PostgreSQL and Better Auth integration", () => {
  const namespace = `test_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: databaseURL });
  const pool = new Pool({
    connectionString: databaseURL,
    options: `-c search_path=${namespace}`,
  });
  pool.on("connect", client => {
    void client.query(`SET search_path TO "${namespace}"`);
  });
  const db = drizzle(pool, { schema });
  let auth: ReturnType<typeof createAuth>;
  let cookie: string;
  let identityId: string;
  const email = "buyer@example.test";
  const password = "test-password-with-12-characters";
  beforeAll(async () => {
    await admin.query(`CREATE SCHEMA "${namespace}"`);
    for (const migration of readMigrationFiles({
      migrationsFolder: "drizzle/postgres",
    })) {
      for (const statement of migration.sql)
        await db.execute(
          sql.raw(statement.replaceAll('"public".', `"${namespace}".`))
        );
    }
    const url = new URL(databaseURL!);
    url.searchParams.set("options", `-c search_path=${namespace}`);
    process.env.DATABASE_URL = url.toString();
    getDb().$client.on("connect", client => {
      void client.query(`SET search_path TO "${namespace}"`);
    });
    auth = createAuth(db, {
      ...process.env,
      NODE_ENV: "test",
      SMTP_HOST: "",
      MAIL_FROM: "",
      BETTER_AUTH_SECRET: "integration-only-secret-with-at-least-32-characters",
      BETTER_AUTH_URL: "http://localhost:3000",
    });
  });
  afterAll(async () => {
    await getDb().$client.end();
    await pool.end();
    await admin.query(`DROP SCHEMA "${namespace}" CASCADE`);
    await admin.end();
  });
  it("registers an account and persists the password hash", async () => {
    const response = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email, password, name: "Buyer", role: "admin" }),
      })
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    identityId = data.user.id;
    cookie = response.headers.get("set-cookie")!.split(";")[0];
    const [account] = await db
      .select()
      .from(schema.authAccounts)
      .where(eq(schema.authAccounts.userId, identityId));
    expect(account.password).toBeTruthy();
    expect(account.password).not.toBe(password);
    expect(await db.select().from(schema.authSessions)).toHaveLength(1);
  });
  it("rejects the wrong password", async () => {
    const response = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email, password: "incorrect-password" }),
      })
    );
    expect(response.status).toBe(401);
  });
  it("retrieves a database session and defaults marketplace accounts to ordinary user", async () => {
    const session = await auth.api.getSession({
      headers: new Headers({ cookie }),
    });
    expect(session?.user.id).toBe(identityId);
    const user = await ensureMarketplaceUser({
      id: identityId,
      name: "Buyer",
      email,
    });
    expect(
      (
        await ensureMarketplaceUser({
          id: identityId,
          name: "Buyer updated",
          email,
        })
      ).id
    ).toBe(user.id);
    expect(user.role).toBe("user");
    await expect(
      db.insert(schema.orders).values({
        userId: -12345,
        customerName: "Buyer",
        customerEmail: email,
        subtotal: "10",
        total: "10",
      })
    ).rejects.toThrow();
  });
  it("rolls back partial order writes", async () => {
    const [buyer] = await db.select().from(schema.users);
    await expect(
      db.transaction(async tx => {
        await tx.insert(schema.orders).values({
          userId: buyer.id,
          customerName: "Buyer",
          customerEmail: email,
          subtotal: "10",
          total: "10",
        });
        throw new Error("simulated failure");
      })
    ).rejects.toThrow("simulated failure");
    expect(await db.select().from(schema.orders)).toHaveLength(0);
  });
  it("creates server-priced orders and makes payment approval idempotent", async () => {
    const [buyer] = await db.select().from(schema.users);
    const [category] = await db
      .insert(schema.categories)
      .values({ name: "Test", slug: "test" })
      .returning();
    const [product] = await db
      .insert(schema.products)
      .values({
        title: "Template",
        slug: "template",
        price: "19.99",
        discountPrice: "9.99",
        categoryId: category.id,
      })
      .returning();
    const order = await createOrder(buyer.id, "Buyer", email, [
      { productId: product.id, quantity: 1 },
    ]);
    expect(order.total).toBe("9.99");
    const paymentId = await createPayment({
      orderId: order.orderId,
      userId: buyer.id,
      paymentMethod: "KBZPay",
      amount: order.total,
      senderName: "Buyer",
      senderPhone: "0912345678",
      screenshotKey: "private/test.png",
    });
    await setPaymentStatus(paymentId, "approved", buyer.id);
    await setPaymentStatus(paymentId, "approved", buyer.id);
    const [updated] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, product.id));
    expect(updated.salesCount).toBe(1);
    expect(
      (
        await db
          .select()
          .from(schema.orders)
          .where(eq(schema.orders.id, order.orderId))
      )[0].paymentStatus
    ).toBe("approved");
    expect(await db.select().from(schema.notifications)).toHaveLength(1);
  });
  it("revokes the session on sign-out", async () => {
    const response = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-out", {
        method: "POST",
        headers: {
          cookie,
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: "{}",
      })
    );
    expect(response.status).toBe(200);
    expect(
      await auth.api.getSession({ headers: new Headers({ cookie }) })
    ).toBeNull();
  });
});
