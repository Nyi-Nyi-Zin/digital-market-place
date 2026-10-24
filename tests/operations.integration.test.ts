import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { eq, sql } from "drizzle-orm";
import * as schema from "@marketplace/server/schema";
import { getDb, setPaymentStatus } from "@marketplace/server/db";
import { completeOrder } from "@marketplace/server/notifications";
import {
  createTicket,
  ticketDetail,
  replyToTicket,
  changeTicketStatus,
  listTickets,
} from "@marketplace/server/support";
import {
  getStoreDocument,
  saveStoreDocument,
  getStoreSettings,
  saveStoreSettings,
} from "@marketplace/server/store";
import {
  orderDetail,
  adminOrderDetail,
  addOrderNote,
  salesReport,
  listCustomers,
  customerDetail,
  listActivity,
} from "@marketplace/server/operations";
const databaseURL = process.env.TEST_DATABASE_URL;
describe.skipIf(!databaseURL)(
  "store operations persistence and privacy",
  () => {
    const namespace = `operations_${randomUUID().replaceAll("-", "")}`;
    const control = new Pool({ connectionString: databaseURL }),
      pool = new Pool({
        connectionString: databaseURL,
        options: `-c search_path=${namespace}`,
      });
    const db = drizzle(pool, { schema });
    const originalUrl = process.env.DATABASE_URL;
    let buyer: number,
      other: number,
      admin: number,
      orderId: number,
      pendingId: number,
      productId: number;
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
          { openId: "buyer", name: "Buyer", email: "buyer@example.test" },
          { openId: "other", name: "Other" },
          { openId: "admin", name: "Admin", role: "admin" },
        ])
        .returning();
      [buyer, other, admin] = identities.map(u => u.id);
      const [category] = await db
        .insert(schema.categories)
        .values({ name: "Resources", slug: "resources" })
        .returning();
      const [product] = await db
        .insert(schema.products)
        .values({
          title: "=Formula, product",
          slug: "resource",
          categoryId: category.id,
          price: "12.50",
        })
        .returning();
      productId = product.id;
      const freshOrder = async (createdAt: Date, approved: boolean) => {
        const [order] = await db
          .insert(schema.orders)
          .values({
            userId: buyer,
            customerName: "Buyer",
            customerEmail: "buyer@example.test",
            subtotal: "25.00",
            total: "25.00",
            createdAt,
            paymentStatus: approved ? "approved" : "pending",
            orderStatus: approved ? "paid" : "payment_pending",
          })
          .returning();
        await db.insert(schema.orderItems).values({
          orderId: order.id,
          productId,
          titleSnapshot: "Original product",
          unitPrice: "12.50",
          quantity: 2,
        });
        return order.id;
      };
      orderId = await freshOrder(new Date("2026-10-24T17:30:00Z"), true); // 25 Oct midnight Myanmar
      pendingId = await freshOrder(new Date("2026-10-25T12:00:00Z"), false);
      await freshOrder(new Date("2026-10-24T17:29:59Z"), true); // previous Myanmar day
      await freshOrder(new Date("2026-10-25T17:30:00Z"), true); // following Myanmar day
      await db.insert(schema.payments).values([
        {
          orderId,
          userId: buyer,
          paymentMethod: "KBZPay",
          amount: "25.00",
          senderName: "Buyer",
          senderPhone: "091234567",
          screenshotKey: "private-proof",
          status: "rejected",
          rejectionReason: "Wrong evidence",
        },
        {
          orderId,
          userId: buyer,
          paymentMethod: "KBZPay",
          amount: "25.00",
          senderName: "Buyer",
          senderPhone: "091234567",
          screenshotKey: "private-proof",
          status: "approved",
          verifiedBy: admin,
          verifiedAt: new Date(),
        },
        {
          orderId: pendingId,
          userId: buyer,
          paymentMethod: "WavePay",
          amount: "25.00",
          senderName: "Buyer",
          senderPhone: "091234567",
          screenshotKey: "private-proof",
          status: "pending",
        },
      ]);
    });
    afterAll(async () => {
      process.env.DATABASE_URL = originalUrl;
      await getDb().$client.end();
      await pool.end();
      await control.query(`DROP SCHEMA "${namespace}" CASCADE`);
      await control.end();
    });
    it("keeps complete payment history and snapshots while excluding internal notes and evidence credentials from customer responses", async () => {
      await addOrderNote(orderId, admin, {
        message: "Internal delivery instruction",
      });
      const customer = await orderDetail(orderId, buyer),
        detail = await adminOrderDetail(orderId);
      expect(customer.items[0].title).toBe("Original product");
      expect(customer.payments).toHaveLength(2);
      expect(JSON.stringify(customer)).not.toContain("private-proof");
      expect(JSON.stringify(customer)).not.toContain(
        "Internal delivery instruction"
      );
      expect(detail.notes[0].body).toBe("Internal delivery instruction");
      expect(detail.evidence[0].screenshotKey).toBe("private-proof");
      await expect(orderDetail(orderId, other)).rejects.toMatchObject({
        status: 404,
      });
    });
    it("owns support requests, stores replies, resolves and reopens without accepting another customer's order", async () => {
      await expect(
        createTicket(other, {
          subject: "Help",
          message: "Help please",
          orderId,
        })
      ).rejects.toMatchObject({ status: 404 });
      const ticket = await createTicket(buyer, {
        subject: "Delivery help",
        message: "Where is my product?",
        orderId,
      });
      await expect(ticketDetail(ticket.id, other)).rejects.toMatchObject({
        status: 404,
      });
      await expect(
        replyToTicket(ticket.id, other, "customer", { message: "Spoof" })
      ).rejects.toMatchObject({ status: 404 });
      await replyToTicket(ticket.id, admin, "admin", {
        message: "We are checking.",
      });
      await changeTicketStatus(ticket.id, admin, { status: "closed" });
      expect((await ticketDetail(ticket.id, buyer)).ticket.status).toBe(
        "closed"
      );
      await replyToTicket(ticket.id, buyer, "customer", {
        message: "One more question",
      });
      const detail = await ticketDetail(ticket.id, buyer);
      expect(detail.ticket.status).toBe("open");
      expect(detail.messages.map(m => m.audience)).toEqual([
        "customer",
        "admin",
        "customer",
      ]);
      expect((await listTickets(other, {})).total).toBe(0);
      expect((await listTickets(undefined, { status: "open" })).total).toBe(1);
    });
    it("publishes per-language content, persists contact settings and rejects stale concurrent writes", async () => {
      const initial = await getStoreDocument("about", "my");
      expect(initial.revision).toBe(0);
      const results = await Promise.allSettled(
        [1, 2].map(i =>
          saveStoreDocument(admin, {
            key: "about",
            locale: "my",
            content: {
              title: `About ${i}`,
              description: "",
              sections: [{ heading: "Our store", body: "Saved content" }],
            },
            revision: 0,
          })
        )
      );
      expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
      expect((await getStoreDocument("about", "my")).revision).toBe(1);
      expect((await getStoreDocument("about", "en")).revision).toBe(0);
      const settings = await getStoreSettings();
      await saveStoreSettings(admin, {
        ...settings,
        supportEmail: "help@example.test",
      });
      expect((await getStoreSettings()).supportEmail).toBe("help@example.test");
      await expect(
        saveStoreSettings(admin, {
          ...settings,
          supportEmail: "stale@example.test",
        })
      ).rejects.toMatchObject({ status: 409 });
    });
    it("reports only approved orders in the inclusive Myanmar date range and does not double-count rejected payment attempts", async () => {
      const report = await salesReport({
        from: "2026-10-25",
        to: "2026-10-25",
      });
      expect(report.summary.count).toBe(1);
      expect(Number(report.summary.revenue)).toBe(25);
      expect(report.daily).toHaveLength(1);
      expect(report.daily[0].day).toBe("2026-10-25");
      expect(report.bestsellers[0].quantity).toBe(2);
      expect(Number(report.methods[0].revenue)).toBe(25);
      const empty = await salesReport({ from: "2025-01-01", to: "2025-01-01" });
      expect(empty.summary.count).toBe(0);
      expect(empty.daily).toEqual([]);
    });
    it("lists customer totals and paginated purchase history without exposing authentication fields", async () => {
      const customers = await listCustomers({ query: "Buyer" });
      expect(customers.total).toBe(1);
      expect(customers.customers[0].orderCount).toBe(4);
      expect(customers.customers[0]).not.toHaveProperty("authUserId");
      const detail = await customerDetail(buyer, {});
      expect(detail.orders).toHaveLength(4);
      expect(Number(detail.summary.paidTotal)).toBe(75);
    });
    it("records payment and delivery decisions once even on repeated confirmations", async () => {
      const [payment] = await db
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.orderId, pendingId));
      await setPaymentStatus(payment.id, "approved", admin);
      await setPaymentStatus(payment.id, "approved", admin);
      await Promise.all([
        completeOrder(pendingId, admin),
        completeOrder(pendingId, admin),
      ]);
      const { entries } = await listActivity({});
      expect(
        entries.filter(
          e =>
            e.action === "Payment approved" &&
            e.target === `payment:${payment.id}`
        )
      ).toHaveLength(1);
      expect(
        entries.filter(
          e =>
            e.action === "Delivery completed" &&
            e.target === `order:${pendingId}`
        )
      ).toHaveLength(1);
      expect((await orderDetail(pendingId, buyer)).order.orderStatus).toBe(
        "completed"
      );
    });
  }
);
