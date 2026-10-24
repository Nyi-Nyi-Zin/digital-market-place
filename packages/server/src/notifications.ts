import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { getDb } from "./database";
import {
  authSessions,
  users,
  notifications,
  notificationPreferences,
  pushSubscriptions,
  notificationDeliveries,
  orders,
  activityLogs,
} from "./schema";
import { HttpError } from "./http";
import {
  notificationMessage,
  notificationListInput,
  notificationReadInput,
  notificationPreferencesInput,
  type NotificationAudience,
  type NotificationKind,
} from "@marketplace/shared/notifications";
import { resolveLocale } from "@marketplace/shared/i18n";
import { pushSubscriptionInput } from "./push-validation";

export type NotificationTransaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];
export function notificationConfiguration() {
  return {
    emailConfigured: Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM),
    pushConfigured: Boolean(
      process.env.VAPID_PUBLIC_KEY &&
        process.env.VAPID_PRIVATE_KEY &&
        process.env.VAPID_SUBJECT
    ),
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || null,
  };
}
export async function emitOrderNotification(
  tx: NotificationTransaction,
  input: {
    kind: NotificationKind;
    eventKey: string;
    userId: number;
    orderId: number;
    paymentId?: number;
    reason?: string;
    actorId?: number;
  }
) {
  const admins = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"));
  const recipients: { userId: number; audience: NotificationAudience }[] = [
    { userId: input.userId, audience: "customer" },
    ...admins
      .filter(a => a.id !== input.actorId)
      .map(a => ({ userId: a.id, audience: "admin" as const })),
  ];
  for (const recipient of recipients) {
    const data = {
      orderId: input.orderId,
      paymentId: input.paymentId ?? 0,
      reason: input.reason ?? "",
    };
    const message = notificationMessage({
      ...recipient,
      kind: input.kind,
      data,
      title: "",
      body: "",
    });
    const [notice] = await tx
      .insert(notifications)
      .values({
        ...recipient,
        ...message,
        kind: input.kind,
        eventKey: input.eventKey,
        orderId: input.orderId,
        paymentId: input.paymentId,
        data,
      })
      .onConflictDoNothing({
        target: [
          notifications.userId,
          notifications.audience,
          notifications.eventKey,
        ],
      })
      .returning();
    if (!notice) continue;
    const [preference] = await tx
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, recipient.userId),
          eq(notificationPreferences.audience, recipient.audience)
        )
      );
    const locale = resolveLocale(preference?.locale);
    if (preference?.emailEnabled !== false)
      await tx.insert(notificationDeliveries).values({
        notificationId: notice.id,
        channel: "email",
        target: "email",
        locale,
      });
    const subscriptions = await tx
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .innerJoin(authSessions, eq(authSessions.id, pushSubscriptions.sessionId))
      .where(
        and(
          eq(pushSubscriptions.userId, recipient.userId),
          eq(pushSubscriptions.audience, recipient.audience),
          eq(pushSubscriptions.active, true),
          sql`${authSessions.expiresAt} > now()`
        )
      );
    if (subscriptions.length)
      await tx.insert(notificationDeliveries).values(
        subscriptions.map(s => ({
          notificationId: notice.id,
          channel: "push" as const,
          target: `push:${s.id}`,
          subscriptionId: s.id,
          locale,
        }))
      );
  }
}

export async function listNotifications(
  userId: number,
  audience: NotificationAudience,
  raw: unknown
) {
  const input = notificationListInput.parse(raw);
  const db = getDb();
  const owned = and(
    eq(notifications.userId, userId),
    eq(notifications.audience, audience)
  );
  const where = and(
    owned,
    input.filter === "unread" ? eq(notifications.read, false) : undefined,
    input.id ? eq(notifications.id, input.id) : undefined
  );
  const [[counts], rows] = await Promise.all([
    db
      .select({
        unreadCount: sql<number>`count(*) filter(where not ${notifications.read})::int`,
        total: sql<number>`count(*) filter(where (${input.filter === "all"} or not ${notifications.read}) and (${input.id ?? null}::integer is null or ${notifications.id} = ${input.id ?? null}))::int`,
      })
      .from(notifications)
      .where(owned),
    db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(input.limit)
      .offset((input.page - 1) * input.limit),
  ]);
  return {
    notifications: rows,
    ...counts,
    page: input.page,
    pages: Math.max(1, Math.ceil(counts.total / input.limit)),
  };
}
export async function updateNotificationRead(
  userId: number,
  audience: NotificationAudience,
  raw: unknown
) {
  const input = notificationReadInput.parse(raw);
  const where = and(
    eq(notifications.userId, userId),
    eq(notifications.audience, audience),
    "id" in input
      ? eq(notifications.id, input.id)
      : input.throughId
        ? lte(notifications.id, input.throughId)
        : undefined
  );
  const rows = await getDb()
    .update(notifications)
    .set({ read: "read" in input ? input.read : true })
    .where(where)
    .returning({ id: notifications.id });
  if ("id" in input && !rows.length)
    throw new HttpError(404, "Notification not found");
}
export async function getNotificationPreferences(
  userId: number,
  audience: NotificationAudience
) {
  const [row] = await getDb()
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.audience, audience)
      )
    );
  return {
    emailEnabled: row?.emailEnabled ?? true,
    locale: row?.locale ?? "en",
    ...notificationConfiguration(),
  };
}
export async function saveNotificationPreferences(
  userId: number,
  audience: NotificationAudience,
  raw: unknown
) {
  const input = notificationPreferencesInput.parse(raw);
  if (Object.keys(input).length)
    await getDb()
      .insert(notificationPreferences)
      .values({ userId, audience, ...input })
      .onConflictDoUpdate({
        target: [
          notificationPreferences.userId,
          notificationPreferences.audience,
        ],
        set: input,
      });
  return getNotificationPreferences(userId, audience);
}

export async function registerPush(
  userId: number,
  audience: NotificationAudience,
  sessionId: string,
  raw: unknown
) {
  const input = pushSubscriptionInput.parse(raw);
  return getDb().transaction(async tx => {
    const [session] = await tx
      .select({ id: authSessions.id })
      .from(authSessions)
      .innerJoin(users, eq(users.authUserId, authSessions.userId))
      .where(
        and(
          eq(authSessions.id, sessionId),
          eq(users.id, userId),
          sql`${authSessions.expiresAt} > now()`,
          audience === "admin" ? eq(users.role, "admin") : undefined
        )
      );
    if (!session) throw new HttpError(401, "Please sign in to continue");
    // Lock serializes account switching for the same browser endpoint, including first registration.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${input.endpoint}))`
    );
    const [existing] = await tx
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, input.endpoint));
    if (existing && existing.userId !== userId && existing.active) {
      const [previousSession] = await tx
        .select({ id: authSessions.id })
        .from(authSessions)
        .where(
          and(
            eq(authSessions.id, existing.sessionId),
            sql`${authSessions.expiresAt} > now()`
          )
        );
      if (previousSession)
        throw new HttpError(
          409,
          "Disable notifications for the previous account on this device first."
        );
    }
    const values = {
      userId,
      audience,
      sessionId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      active: true,
    };
    if (
      existing?.active &&
      existing.userId === userId &&
      existing.audience === audience &&
      existing.sessionId === sessionId &&
      existing.p256dh === input.keys.p256dh &&
      existing.auth === input.keys.auth
    )
      return;
    if (existing) {
      // Retire old queued deliveries before binding the endpoint to a new session.
      await tx
        .update(notificationDeliveries)
        .set({
          status: "skipped",
          lastError: "Device session changed",
          leaseToken: null,
          leaseUntil: null,
        })
        .where(
          and(
            eq(notificationDeliveries.subscriptionId, existing.id),
            inArray(notificationDeliveries.status, [
              "pending",
              "blocked",
              "processing",
            ])
          )
        );
      await tx
        .update(pushSubscriptions)
        .set(values)
        .where(eq(pushSubscriptions.id, existing.id));
    } else await tx.insert(pushSubscriptions).values(values);
  });
}
export async function removePush(
  userId: number,
  audience: NotificationAudience,
  sessionId: string,
  endpoint: string
) {
  await getDb()
    .update(pushSubscriptions)
    .set({ active: false })
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.audience, audience),
        eq(pushSubscriptions.sessionId, sessionId),
        eq(pushSubscriptions.endpoint, endpoint)
      )
    );
}
export async function activePushDevice(
  userId: number,
  audience: NotificationAudience,
  sessionId: string,
  endpoint: string
) {
  const [row] = await getDb()
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.audience, audience),
        eq(pushSubscriptions.sessionId, sessionId),
        eq(pushSubscriptions.endpoint, endpoint),
        eq(pushSubscriptions.active, true)
      )
    );
  return Boolean(row);
}
export async function activePushDeviceHash(
  userId: number,
  audience: NotificationAudience,
  sessionId: string,
  device: string
) {
  const rows = await getDb()
    .select({ endpoint: pushSubscriptions.endpoint })
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.audience, audience),
        eq(pushSubscriptions.sessionId, sessionId),
        eq(pushSubscriptions.active, true)
      )
    );
  return rows.some(
    row => createHash("sha256").update(row.endpoint).digest("hex") === device
  );
}
export async function completeOrder(orderId: number, adminId: number) {
  return getDb().transaction(async tx => {
    const [admin] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, adminId), eq(users.role, "admin")));
    if (!admin) throw new HttpError(403, "Administrator access required");
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update");
    if (!order) throw new HttpError(404, "Order not found");
    if (order.paymentStatus === "approved" && order.orderStatus === "completed")
      return order;
    if (order.paymentStatus !== "approved" || order.orderStatus !== "paid")
      throw new HttpError(409, "Only paid orders can be marked as delivered.");
    const [updated] = await tx
      .update(orders)
      .set({
        orderStatus: "completed",
        completedBy: adminId,
        completedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();
    await tx.insert(activityLogs).values({
      actorId: adminId,
      action: "Delivery completed",
      target: `order:${orderId}`,
    });
    await emitOrderNotification(tx, {
      kind: "delivery_completed",
      eventKey: `order:${orderId}:completed`,
      userId: order.userId,
      orderId,
      actorId: adminId,
    });
    return updated;
  });
}

export async function failedNotificationDeliveries(page = 1) {
  const db = getDb();
  const where = inArray(notificationDeliveries.status, ["failed", "blocked"]);
  const [rows, [count]] = await Promise.all([
    db
      .select({
        id: notificationDeliveries.id,
        notificationId: notifications.id,
        channel: notificationDeliveries.channel,
        status: notificationDeliveries.status,
        attempts: notificationDeliveries.attempts,
        lastError: notificationDeliveries.lastError,
        createdAt: notificationDeliveries.createdAt,
        audience: notifications.audience,
        orderId: notifications.orderId,
      })
      .from(notificationDeliveries)
      .innerJoin(
        notifications,
        eq(notifications.id, notificationDeliveries.notificationId)
      )
      .where(where)
      .orderBy(desc(notificationDeliveries.id))
      .limit(20)
      .offset((page - 1) * 20),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(notificationDeliveries)
      .where(where),
  ]);
  return {
    deliveries: rows,
    total: count.total,
    page,
    pages: Math.max(1, Math.ceil(count.total / 20)),
    ...notificationConfiguration(),
  };
}
export async function retryNotificationDelivery(id: number) {
  const rows = await getDb()
    .update(notificationDeliveries)
    .set({
      status: "pending",
      attempts: 0,
      nextAttemptAt: new Date(),
      leaseToken: null,
      leaseUntil: null,
      lastError: null,
    })
    .where(
      and(
        eq(notificationDeliveries.id, id),
        inArray(notificationDeliveries.status, ["failed", "blocked"])
      )
    )
    .returning({ id: notificationDeliveries.id });
  if (!rows.length)
    throw new HttpError(404, "Delivery not found or already queued");
}
