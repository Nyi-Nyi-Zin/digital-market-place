import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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
} from "@marketplace/server/db";
import { eq } from "drizzle-orm";
import * as schema from "@marketplace/server/schema";
import { createAuth } from "@marketplace/server/auth";

// Opt-in isolated schema. Never use DATABASE_URL for destructive test setup.
vi.mock("@marketplace/server/storage", () => ({
  storagePut: vi.fn(async () => ({
    key: "payment-screenshots/integration.png",
    url: "/storage/cloudinary/image/authenticated/payment-screenshots/integration.png",
  })),
}));
import { submitEvidence, writeReview } from "@marketplace/server/marketplace";
import { catalog } from "@marketplace/server/catalog";
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
    const [approvedOrder] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, order.orderId));
    expect(approvedOrder.paymentStatus).toBe("approved");
    expect(approvedOrder.orderStatus).toBe("paid");
    const notices = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.kind, "payment_approved"));
    expect(notices).toHaveLength(1);
    expect(notices[0].body).toContain("delivered manually");
  });
  it("supports rejection, resubmission, approval and verified reviews", async () => {
    const [buyer] = await db.select().from(schema.users);
    const [product] = await db.select().from(schema.products);
    await db.insert(schema.paymentMethods).values({
      name: "KBZPay",
      enabled: true,
      accountName: "Test account",
      accountNumber: "091234567",
    });
    const order = await createOrder(buyer.id, "Buyer", email, [
      { productId: product.id, quantity: 1 },
    ]);
    const proof = {
      orderId: order.orderId,
      paymentMethod: "KBZPay",
      senderName: "Buyer",
      senderPhone: "091234567",
      screenshotContentType: "image/png",
      screenshotData: Buffer.from([
        137,
        80,
        78,
        71,
        13,
        10,
        26,
        10,
        ...Array(30).fill(0),
      ]).toString("base64"),
    };
    const first = await submitEvidence(buyer.id, proof);
    await expect(submitEvidence(buyer.id, proof)).rejects.toThrow(
      "awaiting review"
    );
    await setPaymentStatus(
      first.paymentId,
      "rejected",
      buyer.id,
      "Reference is unclear"
    );
    const second = await submitEvidence(buyer.id, proof);
    expect(second.paymentId).not.toBe(first.paymentId);
    await setPaymentStatus(second.paymentId, "approved", buyer.id);
    await expect(submitEvidence(buyer.id, proof)).rejects.toThrow(
      "already approved"
    );
    await writeReview(buyer.id, product.id, 4, "Useful product");
    await writeReview(buyer.id, product.id, 5, "Updated after using it");
    expect(await db.select().from(schema.reviews)).toHaveLength(1);
    expect((await db.select().from(schema.products))[0].rating).toBe("5.00");
  });
  it("does not return demo products for an empty catalogue result", async () => {
    const result = await catalog({ query: "does-not-exist" });
    expect(result.products).toHaveLength(0);
    const listed = await catalog();
    expect(listed.products.length).toBeGreaterThan(0);
    expect(listed.products[0]).not.toHaveProperty("digitalFileKey");
    expect(
      (await catalog({ minPrice: "", maxPrice: "" })).products.length
    ).toBeGreaterThan(0);
  });
  it("keeps customer and admin sessions separate and blocks admin registration", async () => {
    const adminAuth = createAuth(db, {
      ...process.env,
      NODE_ENV: "test",
      MARKETPLACE_SITE: "admin",
      SMTP_HOST: "",
      MAIL_FROM: "",
      BETTER_AUTH_SECRET: "integration-only-secret-with-at-least-32-characters",
      BETTER_AUTH_URL: "http://localhost:3001",
    });
    expect(
      await adminAuth.api.getSession({
        headers: new Headers({ cookie }),
      })
    ).toBeNull();
    const registration = await adminAuth.handler(
      new Request("http://localhost:3001/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3001",
        },
        body: JSON.stringify({
          email: "admin-registration@example.test",
          password,
          name: "Uninvited",
        }),
      })
    );
    expect(registration.status).toBe(400);
    const login = await adminAuth.handler(
      new Request("http://localhost:3001/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3001",
        },
        body: JSON.stringify({ email, password }),
      })
    );
    expect(login.status).toBe(200);
    const adminCookie = login.headers.get("set-cookie")!.split(";")[0];
    expect(adminCookie).toMatch(/^cloud-nine-admin\.session_token=/);
    expect(cookie).toMatch(/^cloud-nine-customer\.session_token=/);
    expect(
      await auth.api.getSession({
        headers: new Headers({ cookie: adminCookie }),
      })
    ).toBeNull();
    expect(
      (
        await adminAuth.api.getSession({
          headers: new Headers({ cookie: adminCookie }),
        })
      )?.user.id
    ).toBe(identityId);
    const logout = await adminAuth.handler(
      new Request("http://localhost:3001/api/auth/sign-out", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3001",
          cookie: adminCookie,
        },
        body: "{}",
      })
    );
    expect(logout.status).toBe(200);
    expect(
      (await auth.api.getSession({ headers: new Headers({ cookie }) }))?.user.id
    ).toBe(identityId);
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
