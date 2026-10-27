import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { eq, sql } from "drizzle-orm";
import * as schema from "@marketplace/server/schema";
import { createOrder, getDb, setPaymentStatus } from "@marketplace/server/db";
import { getStoreSettings, saveStoreSettings } from "@marketplace/server/store";
import { customerOrders } from "@marketplace/server/customer-orders";
import { catalog } from "@marketplace/server/catalog";
import { orderDetail, salesReport } from "@marketplace/server/operations";
const actor = vi.hoisted(() => ({ id: 0 }));
vi.mock("@marketplace/server/next-auth", () => ({
  requireUser: vi.fn(async () => ({ id: actor.id })),
}));
vi.mock("@marketplace/server/storage", () => ({
  storagePut: vi.fn(async () => ({ key: "private/currency-proof.png" })),
}));
import { storagePut } from "@marketplace/server/storage";
import { submitEvidence } from "@marketplace/server/marketplace";
import { POST } from "../customer-web/app/api/orders/route";

const databaseURL = process.env.TEST_DATABASE_URL;
describe.skipIf(!databaseURL)("currency orders and admin rates", () => {
  const namespace = `test_currency_${randomUUID().replaceAll("-", "")}`;
  const control = new Pool({ connectionString: databaseURL });
  const pool = new Pool({
    connectionString: databaseURL,
    options: `-c search_path=${namespace}`,
  });
  const db = drizzle(pool, { schema });
  const originalUrl = process.env.DATABASE_URL;
  let buyer: number,
    admin: number,
    products: (typeof schema.products.$inferSelect)[];
  beforeAll(async () => {
    await control.query(`CREATE SCHEMA "${namespace}"`);
    for (const migration of readMigrationFiles({
      migrationsFolder: "drizzle/postgres",
    }))
      for (const statement of migration.sql)
        await db.execute(
          sql.raw(statement.replaceAll('"public".', `"${namespace}".`))
        );
    const url = new URL(databaseURL!);
    url.searchParams.set("options", `-c search_path=${namespace}`);
    process.env.DATABASE_URL = url.toString();
    const identities = await db
      .insert(schema.users)
      .values([
        { openId: "currency-buyer", name: "Buyer" },
        { openId: "currency-admin", name: "Admin", role: "admin" },
      ])
      .returning();
    [buyer, admin] = identities.map(row => row.id);
    actor.id = buyer;
    const [category] = await db
      .insert(schema.categories)
      .values({ name: "Currency", slug: "currency" })
      .returning();
    products = await db
      .insert(schema.products)
      .values(
        ["0.01", "0.01", "9.99"].map((price, index) => ({
          title: `Product ${index}`,
          slug: `product-${index}`,
          price,
          categoryId: category.id,
        }))
      )
      .returning();
    await db.insert(schema.paymentMethods).values([
      {
        name: "KBZPay",
        currency: "MMK",
        enabled: true,
        accountName: "MMK account",
        accountNumber: "091234567",
      },
      {
        name: "AYA Pay",
        currency: "USD",
        enabled: true,
        accountName: "USD account",
        accountNumber: "091234568",
      },
    ]);
  });
  afterAll(async () => {
    await getDb().$client.end();
    await pool.end();
    await control.query(`DROP SCHEMA "${namespace}" CASCADE`);
    await control.end();
    process.env.DATABASE_URL = originalUrl;
  });
  const items = () =>
    products
      .slice(0, 2)
      .map(product => ({ productId: product.id, quantity: 1 }));
  it("rejects unconfigured currencies without creating an order", async () => {
    await expect(
      createOrder(buyer, "Buyer", "buyer@example.test", items(), "SGD")
    ).rejects.toThrow("not configured");
    expect(await db.select().from(schema.orders)).toHaveLength(0);
  });
  it("saves admin rates and snapshots currency, rate, rounded item prices and total", async () => {
    await saveStoreSettings(admin, {
      ...(await getStoreSettings()),
      sgdRate: "1.5",
      mmkRate: "4250",
    });
    const result = await createOrder(
      buyer,
      "Buyer",
      "buyer@example.test",
      items(),
      "SGD"
    );
    expect(result.total).toBe("0.02");
    expect(result.payableTotal).toBe("0.04");
    const order = (await customerOrders(buyer)).find(
      order => order.id === result.orderId
    )!;
    expect(order.currency).toBe("SGD");
    expect(order.exchangeRate).toBe("1.50000000");
    expect(order.items.map(item => item.payableUnitPrice)).toEqual([
      "0.02",
      "0.02",
    ]);
    await saveStoreSettings(admin, {
      ...(await getStoreSettings()),
      sgdRate: "2",
    });
    const unchanged = await orderDetail(order.id, buyer);
    expect(unchanged.order.exchangeRate).toBe("1.50000000");
    expect(unchanged.order.payableTotal).toBe("0.04");
    await saveStoreSettings(admin, {
      ...(await getStoreSettings()),
      sgdRate: null,
    });
    await expect(
      createOrder(buyer, "Buyer", "buyer@example.test", items(), "SGD")
    ).rejects.toThrow("not configured");
    expect((await orderDetail(order.id, buyer)).order.payableTotal).toBe(
      "0.04"
    );
  });
  it("ignores client amounts and rates, validates currency codes and prices in the server", async () => {
    const request = (currency: string) =>
      new Request("http://localhost:3000/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerName: "Buyer",
          customerEmail: "buyer@example.test",
          items: items(),
          currency,
          exchangeRate: "0.01",
          payableTotal: "0.01",
          total: "0.01",
        }),
      });
    expect((await POST(request("EUR"))).status).toBe(400);
    const response = await POST(request("MMK"));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      currency: "MMK",
      total: "0.02",
      exchangeRate: "4250.00000000",
      payableTotal: "86.00",
    });
  });
  it("rejects mismatched payment accounts and records the frozen amount after rates change", async () => {
    const order = await createOrder(
      buyer,
      "Buyer",
      "buyer@example.test",
      [{ productId: products[2].id, quantity: 1 }],
      "MMK"
    );
    await saveStoreSettings(admin, {
      ...(await getStoreSettings()),
      mmkRate: "5000",
    });
    const proof = {
      orderId: order.orderId,
      paymentMethod: "AYA Pay",
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
    vi.mocked(storagePut).mockClear();
    await expect(submitEvidence(buyer, proof)).rejects.toThrow(
      "matches the order currency"
    );
    expect(storagePut).not.toHaveBeenCalled();
    const payment = await submitEvidence(buyer, {
      ...proof,
      paymentMethod: "KBZPay",
    });
    const [saved] = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.id, payment.paymentId));
    expect(saved).toMatchObject({
      currency: "MMK",
      payableAmount: "42458.00",
      amount: "9.99",
    });
    await setPaymentStatus(saved.id, "approved", admin);
    const data = await orderDetail(order.orderId, buyer);
    expect(data.payments[0].payableAmount).toBe("42458.00");
    expect(data.order.orderStatus).toBe("paid");
    const today = new Date().toISOString().slice(0, 10);
    expect(
      (await salesReport({ from: today, to: today })).summary.revenue
    ).toBe("9.99");
  });
  it("filters on rounded converted prices including the whole-kyat boundary", async () => {
    const result = await catalog({
      minPrice: "43",
      maxPrice: "43",
      displayCurrency: "MMK",
      displayRate: "4250",
    });
    expect(result.products).toHaveLength(2);
    expect(result.products.map(product => product.price)).toEqual([0.01, 0.01]);
  });
  it("persists quantities from the orders API and multiplies rounded unit prices", async () => {
    await saveStoreSettings(admin, {
      ...(await getStoreSettings()),
      sgdRate: "1.5",
    });
    const response = await POST(
      new Request("http://localhost:3000/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerName: "Buyer",
          customerEmail: "buyer@example.test",
          currency: "SGD",
          items: [
            { productId: products[0].id, quantity: 3 },
            { productId: products[2].id, quantity: 2 },
          ],
        }),
      })
    );
    expect(response.status).toBe(201);
    const result = await response.json();
    expect(result.total).toBe("20.01");
    expect(result.payableTotal).toBe("30.04");
    const saved = await orderDetail(result.orderId, buyer);
    expect(
      saved.items.find(item => item.productId === products[0].id)
    ).toMatchObject({
      quantity: 3,
      unitPrice: "0.01",
      payableUnitPrice: "0.02",
    });
    expect(
      saved.items.find(item => item.productId === products[2].id)
    ).toMatchObject({
      quantity: 2,
      unitPrice: "9.99",
      payableUnitPrice: "14.99",
    });
  });
  it("rejects invalid quantities and duplicate lines at both API and database boundaries", async () => {
    for (const quantity of [0, -1, 1.5, 100]) {
      const items = [{ productId: products[0].id, quantity }];
      await expect(
        createOrder(buyer, "Buyer", "buyer@example.test", items)
      ).rejects.toThrow();
      expect(
        (
          await POST(
            new Request("http://localhost:3000/api/orders", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                customerName: "Buyer",
                customerEmail: "buyer@example.test",
                items,
              }),
            })
          )
        ).status
      ).toBe(400);
    }
    await expect(
      createOrder(buyer, "Buyer", "buyer@example.test", [
        { productId: products[0].id, quantity: 1 },
        { productId: products[0].id, quantity: 2 },
      ])
    ).rejects.toThrow("distinct");
  });
});
