import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { and, eq, sql } from "drizzle-orm";
import * as schema from "@marketplace/server/schema";
import { createOrder, setPaymentStatus, getDb } from "@marketplace/server/db";
import {
  emitOrderNotification,
  listNotifications,
  updateNotificationRead,
  saveNotificationPreferences,
  registerPush,
  activePushDevice,
  removePush,
  completeOrder,
  retryNotificationDelivery,
  failedNotificationDeliveries,
} from "@marketplace/server/notifications";
import {
  processNotificationBatch,
  type NotificationTransport,
} from "@marketplace/server/notification-worker";
vi.mock("@marketplace/server/storage", () => ({
  storagePut: vi.fn(async () => ({
    key: "cloudinary/test",
    url: "/storage/test",
  })),
}));
import { submitEvidence } from "@marketplace/server/marketplace";

const databaseURL = process.env.TEST_DATABASE_URL;
describe.skipIf(!databaseURL)(
  "persistent notifications and delivery queue",
  () => {
    const namespace = `notifications_${randomUUID().replaceAll("-", "")}`;
    const control = new Pool({ connectionString: databaseURL });
    const pool = new Pool({
      connectionString: databaseURL,
      options: `-c search_path=${namespace}`,
    });
    const db = drizzle(pool, { schema });
    let buyer: typeof schema.users.$inferSelect;
    let firstAdmin: typeof schema.users.$inferSelect;
    let secondAdmin: typeof schema.users.$inferSelect;
    let other: typeof schema.users.$inferSelect;
    let productId: number;
    let legacy: { audience: string; read: boolean; body: string };
    const sessionId = "notification-buyer-session";
    const transport = {
      email: vi.fn(async () => {}),
      push: vi.fn(async () => {}),
    } satisfies NotificationTransport;
    const subscription = {
      endpoint: "https://fcm.googleapis.com/fcm/send/notification-test",
      keys: {
        p256dh: Buffer.alloc(65, 4).toString("base64url"),
        auth: Buffer.alloc(16, 1).toString("base64url"),
      },
    };
    const freshOrder = () =>
      createOrder(
        buyer.id,
        "Notification buyer",
        "checkout-address@example.test",
        [{ productId, quantity: 1 }]
      );
    const noticesFor = async (orderId: number, kind?: string) =>
      db
        .select()
        .from(schema.notifications)
        .where(
          and(
            eq(schema.notifications.orderId, orderId),
            kind ? eq(schema.notifications.kind, kind) : undefined
          )
        );
    const proof = (orderId: number) => ({
      orderId,
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
    });
    beforeAll(async () => {
      await control.query(`CREATE SCHEMA "${namespace}"`);
      const migrations = readMigrationFiles({
        migrationsFolder: "drizzle/postgres",
      });
      for (let i = 0; i < migrations.length; i++) {
        if (i === 2) {
          const [oldUser] = await db
            .insert(schema.users)
            .values({ openId: "legacy-notification-admin", role: "admin" })
            .returning();
          // Use raw SQL here: these columns deliberately do not exist before migration 0002.
          await db.execute(
            sql`insert into notifications ("userId", title, body, kind, read) values (${oldUser.id}, 'New payment evidence', 'Keep original history', 'payment_submitted', true)`
          );
        }
        for (const statement of migrations[i].sql)
          await db.execute(
            sql.raw(statement.replaceAll('"public".', `"${namespace}".`))
          );
      }
      [legacy] = await db
        .select({
          audience: schema.notifications.audience,
          read: schema.notifications.read,
          body: schema.notifications.body,
        })
        .from(schema.notifications);
      expect(
        await db.select().from(schema.notificationDeliveries)
      ).toHaveLength(0);
      await db.delete(schema.notifications);
      await db.delete(schema.users);
      const url = new URL(databaseURL!);
      url.searchParams.set("options", `-c search_path=${namespace}`);
      process.env.DATABASE_URL = url.toString();
      for (const [id, role] of [
        ["buyer", "user"],
        ["admin-one", "admin"],
        ["admin-two", "admin"],
        ["other", "user"],
      ] as const) {
        await db.insert(schema.authUsers).values({
          id,
          name: id,
          email: `${id}@example.test`,
          emailVerified: true,
        });
        const [user] = await db
          .insert(schema.users)
          .values({
            openId: `notification:${id}`,
            authUserId: id,
            name: id,
            email: `${id}@example.test`,
            role,
          })
          .returning();
        if (id === "buyer") buyer = user;
        else if (id === "admin-one") firstAdmin = user;
        else if (id === "admin-two") secondAdmin = user;
        else other = user;
      }
      const [category] = await db
        .insert(schema.categories)
        .values({ name: "Notifications", slug: "notification-tests" })
        .returning();
      const [product] = await db
        .insert(schema.products)
        .values({
          title: "Notification product",
          slug: "notification-product",
          categoryId: category.id,
          price: "9.99",
        })
        .returning();
      productId = product.id;
      await db.insert(schema.paymentMethods).values({
        name: "KBZPay",
        enabled: true,
        accountName: "Test",
        accountNumber: "test",
      });
    });
    beforeEach(async () => {
      vi.clearAllMocks();
      transport.email.mockReset().mockResolvedValue(undefined);
      transport.push.mockReset().mockResolvedValue(undefined);
      for (const [key, value] of Object.entries({
        SMTP_HOST: "smtp.example.test",
        MAIL_FROM: "test@example.test",
        VAPID_PUBLIC_KEY: "test-public",
        VAPID_PRIVATE_KEY: "test-private",
        VAPID_SUBJECT: "mailto:test@example.test",
      }))
        vi.stubEnv(key, value);
      await db.delete(schema.notifications);
      await db.delete(schema.pushSubscriptions);
      await db.delete(schema.notificationPreferences);
      await db
        .update(schema.users)
        .set({ role: "admin" })
        .where(eq(schema.users.id, secondAdmin.id));
      await db
        .update(schema.authUsers)
        .set({ emailVerified: true })
        .where(eq(schema.authUsers.id, buyer.authUserId!));
      await db.delete(schema.authSessions);
      await db.insert(schema.authSessions).values({
        id: sessionId,
        token: randomUUID(),
        userId: buyer.authUserId!,
        expiresAt: new Date(Date.now() + 3600000),
      });
    });
    afterAll(async () => {
      vi.unstubAllEnvs();
      await getDb().$client.end();
      await pool.end();
      await control.query(`DROP SCHEMA "${namespace}" CASCADE`);
      await control.end();
    });
    it("migrates legacy admin history without changing read state or replaying messages", () => {
      expect(legacy).toEqual({
        audience: "admin",
        read: true,
        body: "Keep original history",
      });
    });
    it("persists each order event and delivery job atomically and deduplicates recipients", async () => {
      const order = await freshOrder();
      expect(await noticesFor(order.orderId)).toHaveLength(3);
      expect(
        await db.select().from(schema.notificationDeliveries)
      ).toHaveLength(3);
      await getDb().transaction(tx =>
        emitOrderNotification(tx, {
          kind: "order_created",
          eventKey: `order:${order.orderId}:created`,
          userId: buyer.id,
          orderId: order.orderId,
        })
      );
      expect(await noticesFor(order.orderId)).toHaveLength(3);
      expect(
        await db.select().from(schema.notificationDeliveries)
      ).toHaveLength(3);
      await expect(
        getDb().transaction(async tx => {
          await emitOrderNotification(tx, {
            kind: "order_created",
            eventKey: "rollback",
            userId: buyer.id,
            orderId: order.orderId,
          });
          throw new Error("rollback");
        })
      ).rejects.toThrow("rollback");
      expect(
        await db.select().from(schema.notificationDeliveries)
      ).toHaveLength(3);
    });
    it("covers reject, resubmit, approve and concurrent delivery completion", async () => {
      const order = await freshOrder();
      await expect(completeOrder(order.orderId, firstAdmin.id)).rejects.toThrow(
        "Only paid orders"
      );
      await expect(completeOrder(order.orderId, buyer.id)).rejects.toThrow(
        "Administrator access"
      );
      const first = await submitEvidence(buyer.id, proof(order.orderId));
      await expect(
        submitEvidence(buyer.id, proof(order.orderId))
      ).rejects.toThrow("awaiting review");
      expect(await noticesFor(order.orderId, "payment_submitted")).toHaveLength(
        3
      );
      await setPaymentStatus(
        first.paymentId,
        "rejected",
        firstAdmin.id,
        "Blurry reference"
      );
      const second = await submitEvidence(buyer.id, proof(order.orderId));
      expect(second.paymentId).not.toBe(first.paymentId);
      await Promise.all([
        setPaymentStatus(second.paymentId, "approved", firstAdmin.id),
        setPaymentStatus(second.paymentId, "approved", firstAdmin.id),
      ]);
      const approved = await noticesFor(order.orderId, "payment_approved");
      expect(approved).toHaveLength(2);
      expect(approved.some(n => n.userId === firstAdmin.id)).toBe(false);
      const [paid] = await db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, order.orderId));
      expect(paid.orderStatus).toBe("paid");
      expect(paid.completedAt).toBeNull();
      await Promise.all([
        completeOrder(order.orderId, firstAdmin.id),
        completeOrder(order.orderId, secondAdmin.id),
      ]);
      expect(
        await noticesFor(order.orderId, "delivery_completed")
      ).toHaveLength(2);
      const [completed] = await db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, order.orderId));
      expect(completed.orderStatus).toBe("completed");
      expect([firstAdmin.id, secondAdmin.id]).toContain(completed.completedBy);
      expect(completed.completedAt).toBeInstanceOf(Date);
      expect(
        (await noticesFor(order.orderId, "delivery_completed")).some(
          n => n.audience === "admin" && n.userId === completed.completedBy
        )
      ).toBe(false);
    });
    it("isolates owners, admin read states and customer/admin inboxes", async () => {
      const order = await freshOrder();
      const notices = await noticesFor(order.orderId);
      const adminNotice = notices.find(n => n.userId === firstAdmin.id)!;
      await updateNotificationRead(firstAdmin.id, "admin", {
        id: adminNotice.id,
        read: true,
      });
      expect(
        (await listNotifications(firstAdmin.id, "admin", {})).unreadCount
      ).toBe(0);
      expect(
        (await listNotifications(secondAdmin.id, "admin", {})).unreadCount
      ).toBe(1);
      expect(
        (await listNotifications(other.id, "customer", { id: adminNotice.id }))
          .notifications
      ).toHaveLength(0);
      await expect(
        updateNotificationRead(other.id, "customer", {
          id: adminNotice.id,
          read: false,
        })
      ).rejects.toThrow("Notification not found");
      expect(
        (await listNotifications(firstAdmin.id, "customer", {})).total
      ).toBe(0);
      await createOrder(
        firstAdmin.id,
        "Admin buyer",
        "admin-one@example.test",
        [{ productId, quantity: 1 }]
      );
      await updateNotificationRead(firstAdmin.id, "admin", { all: true });
      expect(
        (await listNotifications(firstAdmin.id, "customer", {})).unreadCount
      ).toBe(1);
    });
    it("paginates stably, filters unread and preserves notifications arriving after a bounded read action", async () => {
      await db.insert(schema.notifications).values(
        Array.from({ length: 25 }, (_, i) => ({
          userId: buyer.id,
          title: `notice ${i}`,
          body: "test",
          kind: "legacy",
          read: i < 5,
        }))
      );
      const first = await listNotifications(buyer.id, "customer", {});
      const second = await listNotifications(buyer.id, "customer", { page: 2 });
      expect(first.notifications).toHaveLength(20);
      expect(second.notifications).toHaveLength(5);
      expect(first.unreadCount).toBe(20);
      expect(
        new Set(
          [...first.notifications, ...second.notifications].map(n => n.id)
        ).size
      ).toBe(25);
      await db.insert(schema.notifications).values({
        userId: buyer.id,
        title: "New",
        body: "New",
        kind: "legacy",
      });
      await updateNotificationRead(buyer.id, "customer", {
        all: true,
        throughId: first.notifications[0].id,
      });
      expect(
        (await listNotifications(buyer.id, "customer", { filter: "unread" }))
          .total
      ).toBe(1);
    });
    it("honors settings and sends only to verified account emails", async () => {
      await saveNotificationPreferences(buyer.id, "customer", {
        emailEnabled: false,
        locale: "my",
      });
      await freshOrder();
      expect(
        await db.select().from(schema.notificationDeliveries)
      ).toHaveLength(2);
      await processNotificationBatch({ transport });
      expect(transport.email).toHaveBeenCalledTimes(2);
      await saveNotificationPreferences(buyer.id, "customer", {
        emailEnabled: true,
        locale: "my",
      });
      await freshOrder();
      await processNotificationBatch({ transport });
      const message = transport.email.mock.calls
        .map(call => call[0])
        .find(message => message.to === "buyer@example.test");
      expect(message?.to).not.toBe("checkout-address@example.test");
      expect(message?.subject).toContain("အော်ဒါ");
      await db
        .update(schema.authUsers)
        .set({ emailVerified: false })
        .where(eq(schema.authUsers.id, buyer.authUserId!));
      transport.email.mockClear();
      await freshOrder();
      await processNotificationBatch({ transport });
      expect(
        transport.email.mock.calls.some(
          call => call[0].to === "buyer@example.test"
        )
      ).toBe(false);
    });
    it("keeps business writes successful and blocks unconfigured external channels without spending attempts", async () => {
      vi.stubEnv("SMTP_HOST", "");
      await freshOrder();
      const result = await processNotificationBatch({ transport });
      expect(result.blocked).toBe(3);
      expect(transport.email).not.toHaveBeenCalled();
      expect((await failedNotificationDeliveries()).total).toBe(3);
      expect(
        (await db.select().from(schema.notificationDeliveries)).every(
          j => j.attempts === 0
        )
      ).toBe(true);
    });
    it("claims jobs exclusively across concurrent workers and recovers expired leases", async () => {
      await freshOrder();
      await db.update(schema.notificationDeliveries).set({
        status: "processing",
        leaseToken: "crashed-worker",
        leaseUntil: new Date(0),
      });
      const results = await Promise.all([
        processNotificationBatch({ transport }),
        processNotificationBatch({ transport }),
      ]);
      expect(results.reduce((sum, r) => sum + r.sent, 0)).toBe(3);
      expect(transport.email).toHaveBeenCalledTimes(3);
      await processNotificationBatch({ transport });
      expect(transport.email).toHaveBeenCalledTimes(3);
    });
    it("retries transient errors six times, exposes failures and allows explicit retry", async () => {
      await freshOrder();
      transport.email.mockRejectedValue(
        Object.assign(new Error("private provider details"), {
          responseCode: 451,
        })
      );
      for (let i = 0; i < 6; i++) {
        await processNotificationBatch({ transport });
        await db
          .update(schema.notificationDeliveries)
          .set({ nextAttemptAt: new Date(0) });
      }
      expect(transport.email).toHaveBeenCalledTimes(18);
      const jobs = await db.select().from(schema.notificationDeliveries);
      expect(jobs.every(j => j.status === "failed" && j.attempts === 6)).toBe(
        true
      );
      expect(jobs.some(j => j.lastError?.includes("private"))).toBe(false);
      await retryNotificationDelivery(jobs[0].id);
      transport.email.mockResolvedValue(undefined);
      expect((await processNotificationBatch({ transport })).sent).toBe(1);
    });
    it("binds push to its owner/session, preserves idempotent registration and sends a private payload", async () => {
      await registerPush(buyer.id, "customer", sessionId, subscription);
      await freshOrder();
      await registerPush(buyer.id, "customer", sessionId, subscription);
      expect(
        await activePushDevice(
          buyer.id,
          "customer",
          sessionId,
          subscription.endpoint
        )
      ).toBe(true);
      expect(
        await activePushDevice(
          other.id,
          "customer",
          sessionId,
          subscription.endpoint
        )
      ).toBe(false);
      await processNotificationBatch({ transport });
      expect(transport.push).toHaveBeenCalledTimes(1);
      const payload = JSON.parse(transport.push.mock.calls[0][1]);
      expect(payload.body).toBe("You have a new update.");
      expect(payload.url).toMatch(/^\/notification\/\d+$/);
      expect(JSON.stringify(payload)).not.toMatch(
        /example.test|9.99|Notification buyer|orderId/
      );
      await removePush(buyer.id, "customer", sessionId, subscription.endpoint);
      await freshOrder();
      await processNotificationBatch({ transport });
      expect(transport.push).toHaveBeenCalledTimes(1);
    });
    it("prevents endpoint takeover while the previous account session is active", async () => {
      await registerPush(buyer.id, "customer", sessionId, subscription);
      await db.insert(schema.authSessions).values({
        id: "other-session",
        token: randomUUID(),
        userId: other.authUserId!,
        expiresAt: new Date(Date.now() + 3600000),
      });
      await expect(
        registerPush(other.id, "customer", "other-session", subscription)
      ).rejects.toThrow("previous account");
      await db
        .delete(schema.authSessions)
        .where(eq(schema.authSessions.id, sessionId));
      await registerPush(other.id, "customer", "other-session", subscription);
      expect(
        await activePushDevice(
          other.id,
          "customer",
          "other-session",
          subscription.endpoint
        )
      ).toBe(true);
    });
    it("stops queued push after logout/session expiry and drops expired subscriptions", async () => {
      await registerPush(buyer.id, "customer", sessionId, subscription);
      await freshOrder();
      await db
        .update(schema.authSessions)
        .set({ expiresAt: new Date(0) })
        .where(eq(schema.authSessions.id, sessionId));
      await processNotificationBatch({ transport });
      expect(transport.push).not.toHaveBeenCalled();
      await db
        .update(schema.authSessions)
        .set({ expiresAt: new Date(Date.now() + 3600000) })
        .where(eq(schema.authSessions.id, sessionId));
      await freshOrder();
      transport.push.mockRejectedValue(
        Object.assign(new Error("gone"), { statusCode: 410 })
      );
      await processNotificationBatch({ transport });
      expect(
        await activePushDevice(
          buyer.id,
          "customer",
          sessionId,
          subscription.endpoint
        )
      ).toBe(false);
      transport.push.mockClear();
      await freshOrder();
      await db
        .delete(schema.authSessions)
        .where(eq(schema.authSessions.id, sessionId));
      await processNotificationBatch({ transport });
      expect(transport.push).not.toHaveBeenCalled();
    });
    it("does not disable a newly bound session when an older in-flight push expires", async () => {
      await registerPush(buyer.id, "customer", sessionId, subscription);
      await freshOrder();
      await db
        .insert(schema.authSessions)
        .values({
          id: "renewed-session",
          token: randomUUID(),
          userId: buyer.authUserId!,
          expiresAt: new Date(Date.now() + 3600000),
        });
      transport.push.mockImplementationOnce(async () => {
        await registerPush(
          buyer.id,
          "customer",
          "renewed-session",
          subscription
        );
        throw Object.assign(new Error("old subscription expired"), {
          statusCode: 410,
        });
      });
      await processNotificationBatch({ transport });
      expect(
        await activePushDevice(
          buyer.id,
          "customer",
          "renewed-session",
          subscription.endpoint
        )
      ).toBe(true);
    });
    it("checks admin roles and settings again before delivery", async () => {
      await freshOrder();
      await db
        .update(schema.users)
        .set({ role: "user" })
        .where(eq(schema.users.id, secondAdmin.id));
      await saveNotificationPreferences(buyer.id, "customer", {
        emailEnabled: false,
      });
      const result = await processNotificationBatch({ transport });
      expect(result.skipped).toBe(2);
      expect(result.sent).toBe(1);
      expect(transport.email.mock.calls[0][0].to).toBe(
        "admin-one@example.test"
      );
    });
  }
);
