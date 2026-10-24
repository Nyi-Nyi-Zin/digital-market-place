import { randomUUID, timingSafeEqual } from "node:crypto";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { createTransport } from "nodemailer";
import webpush from "web-push";
import { getDb } from "./database";
import {
  authSessions,
  authUsers,
  users,
  notifications,
  notificationDeliveries,
  notificationPreferences,
  pushSubscriptions,
} from "./schema";
import {
  notificationMessage,
  notificationPath,
  type NotificationAudience,
} from "@marketplace/shared/notifications";
import { createTranslator, resolveLocale } from "@marketplace/shared/i18n";
import { dictionaries } from "@marketplace/shared/locales";
import { assertPublicPushEndpoint } from "./push-validation";
import { notificationConfiguration } from "./notifications";

export const retryDelays = [60_000, 300_000, 900_000, 3_600_000, 21_600_000];
export function workerAuthorized(
  header: string | null,
  secret = process.env.NOTIFICATION_WORKER_SECRET
) {
  if (!secret || secret.length < 32 || !header?.startsWith("Bearer "))
    return false;
  const expected = Buffer.from(secret),
    actual = Buffer.from(header.slice(7));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function notificationOrigin(audience: NotificationAudience) {
  const value =
    audience === "admin"
      ? process.env.NEXT_PUBLIC_ADMIN_URL
      : process.env.NEXT_PUBLIC_CUSTOMER_URL;
  const url = new URL(
    value ??
      (audience === "admin" ? "http://localhost:3001" : "http://localhost:3000")
  );
  if (
    url.protocol !== "https:" &&
    !(
      process.env.NODE_ENV !== "production" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("Notification site origin must use HTTPS");
  return url.origin;
}
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!
  );
export function notificationEmail(
  title: string,
  body: string,
  link: string,
  label: string
) {
  return {
    text: `${title}\n\n${body}\n\n${label}: ${link}`,
    html: `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p><p><a href="${escapeHtml(link)}">${escapeHtml(label)}</a></p>`,
  };
}
class DeliveryProblem extends Error {
  constructor(
    message: string,
    public outcome: "failed" | "blocked" | "skipped"
  ) {
    super(message);
  }
}
type Delivery = typeof notificationDeliveries.$inferSelect;
export type NotificationTransport = {
  email: (message: {
    to: string;
    subject: string;
    text: string;
    html: string;
    messageId: string;
  }) => Promise<void>;
  push: (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string
  ) => Promise<void>;
};
function defaultTransport(): NotificationTransport {
  const mailer = createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === "465",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });
  return {
    email: async message => {
      await mailer.sendMail({ ...message, from: process.env.MAIL_FROM });
    },
    push: async (subscription, payload) => {
      await assertPublicPushEndpoint(subscription.endpoint);
      await webpush.sendNotification(subscription, payload, {
        TTL: 3600,
        timeout: 10000,
        vapidDetails: {
          subject: process.env.VAPID_SUBJECT!,
          publicKey: process.env.VAPID_PUBLIC_KEY!,
          privateKey: process.env.VAPID_PRIVATE_KEY!,
        },
      });
    },
  };
}
async function claimDeliveries(limit: number) {
  const db = getDb();
  return db.transaction(async tx => {
    const rows = await tx
      .select()
      .from(notificationDeliveries)
      .where(
        or(
          and(
            inArray(notificationDeliveries.status, ["pending", "blocked"]),
            sql`${notificationDeliveries.nextAttemptAt} <= now()`
          ),
          and(
            eq(notificationDeliveries.status, "processing"),
            sql`${notificationDeliveries.leaseUntil} < now()`
          )
        )
      )
      .orderBy(notificationDeliveries.nextAttemptAt, notificationDeliveries.id)
      .limit(limit)
      .for("update", { skipLocked: true });
    if (!rows.length) return [];
    const leaseToken = randomUUID();
    return tx
      .update(notificationDeliveries)
      .set({
        status: "processing",
        leaseToken,
        leaseUntil: new Date(Date.now() + 120000),
      })
      .where(
        inArray(
          notificationDeliveries.id,
          rows.map(row => row.id)
        )
      )
      .returning();
  });
}
async function deliver(job: Delivery, transport: NotificationTransport) {
  const db = getDb();
  const owned = and(
    eq(notificationDeliveries.id, job.id),
    eq(notificationDeliveries.leaseToken, job.leaseToken!),
    eq(notificationDeliveries.status, "processing")
  );
  const finish = async (
    values: Partial<typeof notificationDeliveries.$inferInsert>
  ) => {
    await db
      .update(notificationDeliveries)
      .set({ ...values, leaseToken: null, leaseUntil: null })
      .where(owned);
  };
  let attempted = false;
  try {
    const [record] = await db
      .select({ notice: notifications, user: users, authUser: authUsers })
      .from(notifications)
      .innerJoin(users, eq(users.id, notifications.userId))
      .leftJoin(authUsers, eq(authUsers.id, users.authUserId))
      .where(eq(notifications.id, job.notificationId));
    if (!record)
      throw new DeliveryProblem("Recipient no longer exists", "skipped");
    const { notice, user, authUser } = record;
    if (notice.audience === "admin" && user.role !== "admin")
      throw new DeliveryProblem("Administrator access revoked", "skipped");
    if (job.attempts >= 6)
      throw new DeliveryProblem("Maximum delivery attempts reached", "failed");
    const [preference] = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, user.id),
          eq(notificationPreferences.audience, notice.audience)
        )
      );
    const config = notificationConfiguration();
    let subscription: typeof pushSubscriptions.$inferSelect | undefined;
    if (job.channel === "email") {
      if (preference?.emailEnabled === false)
        throw new DeliveryProblem("Email notifications disabled", "skipped");
      if (!authUser?.emailVerified)
        throw new DeliveryProblem(
          "A verified account email is required",
          "skipped"
        );
      if (!config.emailConfigured)
        throw new DeliveryProblem(
          "Email delivery is not configured",
          "blocked"
        );
    } else {
      if (!job.subscriptionId)
        throw new DeliveryProblem("Push subscription expired", "skipped");
      const [row] = await db
        .select({ subscription: pushSubscriptions })
        .from(pushSubscriptions)
        .innerJoin(
          authSessions,
          eq(authSessions.id, pushSubscriptions.sessionId)
        )
        .where(
          and(
            eq(pushSubscriptions.id, job.subscriptionId),
            eq(pushSubscriptions.active, true),
            eq(pushSubscriptions.userId, user.id),
            eq(pushSubscriptions.audience, notice.audience),
            eq(authSessions.userId, user.authUserId ?? ""),
            sql`${authSessions.expiresAt} > now()`
          )
        );
      if (!row)
        throw new DeliveryProblem(
          "Push device signed out or disabled",
          "skipped"
        );
      subscription = row.subscription;
      if (!config.pushConfigured)
        throw new DeliveryProblem("Push delivery is not configured", "blocked");
    }
    let origin: string;
    try {
      origin = notificationOrigin(notice.audience);
    } catch {
      throw new DeliveryProblem(
        "Notification site origin must use HTTPS",
        "blocked"
      );
    }
    const updated = await db
      .update(notificationDeliveries)
      .set({ attempts: sql`${notificationDeliveries.attempts} + 1` })
      .where(owned)
      .returning({ id: notificationDeliveries.id });
    if (!updated.length) return "skipped";
    attempted = true;
    const locale = resolveLocale(job.locale),
      t = createTranslator(dictionaries[locale]);
    if (job.channel === "email") {
      const message = notificationMessage(notice, t);
      await transport.email({
        to: authUser!.email,
        subject: `Cloud Nine — ${message.title}`,
        ...notificationEmail(
          message.title,
          message.body,
          new URL(notificationPath(notice), origin).toString(),
          t("View update")
        ),
        messageId: `<cloud-nine-notification-${job.id}@${new URL(origin).hostname}>`,
      });
    } else {
      await transport.push(
        {
          endpoint: subscription!.endpoint,
          keys: { p256dh: subscription!.p256dh, auth: subscription!.auth },
        },
        JSON.stringify({
          title: "Cloud Nine",
          body: t("You have a new update."),
          tag: `notification-${notice.id}`,
          // Opening the inbox authenticates the current account before resolving the target.
          url: `/notification/${notice.id}`,
        })
      );
    }
    await finish({ status: "sent", sentAt: new Date(), lastError: null });
    return "sent";
  } catch (error) {
    if (error instanceof DeliveryProblem) {
      await finish({
        status: error.outcome,
        lastError: error.message,
        nextAttemptAt: new Date(Date.now() + 300000),
      });
      return error.outcome;
    }
    const status = Number((error as { statusCode?: number }).statusCode);
    const smtpCode = Number((error as { responseCode?: number }).responseCode);
    if (job.channel === "push" && [404, 410].includes(status)) {
      if (job.subscriptionId)
        await db
          .update(pushSubscriptions)
          .set({ active: false })
          .where(
            and(
              eq(pushSubscriptions.id, job.subscriptionId),
              sql`exists (
            select 1 from ${notificationDeliveries} where ${notificationDeliveries.id} = ${job.id}
            and ${notificationDeliveries.leaseToken} = ${job.leaseToken}
            and ${notificationDeliveries.status} = 'processing'
          )`
            )
          );
      await finish({
        status: "skipped",
        lastError: "Push subscription expired",
      });
      return "skipped";
    }
    const attempts = job.attempts + (attempted ? 1 : 0);
    const permanent =
      (status >= 400 && status < 500 && ![408, 429].includes(status)) ||
      smtpCode >= 500;
    const failed = permanent || attempts >= 6;
    await finish({
      status: failed ? "failed" : "pending",
      lastError: permanent
        ? "Delivery provider rejected the request"
        : "Delivery temporarily unavailable",
      nextAttemptAt: new Date(
        Date.now() +
          retryDelays[
            Math.max(0, Math.min(attempts - 1, retryDelays.length - 1))
          ]
      ),
    });
    return failed ? "failed" : "pending";
  }
}
export async function processNotificationBatch(
  options: { limit?: number; transport?: NotificationTransport } = {}
) {
  const jobs = await claimDeliveries(
    Math.min(50, Math.max(1, options.limit ?? 10))
  );
  const results: string[] = [];
  const transport = options.transport ?? defaultTransport();
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(5, jobs.length) }, async () => {
      while (cursor < jobs.length) {
        const job = jobs[cursor++];
        results.push(await deliver(job, transport));
      }
    })
  );
  return {
    processed: jobs.length,
    sent: results.filter(s => s === "sent").length,
    failed: results.filter(s => s === "failed").length,
    blocked: results.filter(s => s === "blocked").length,
    skipped: results.filter(s => s === "skipped").length,
  };
}
