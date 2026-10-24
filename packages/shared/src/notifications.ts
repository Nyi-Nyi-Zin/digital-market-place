import { z } from "zod";
import { createTranslator } from "./i18n";

export type NotificationAudience = "customer" | "admin";
export const notificationKinds = [
  "order_created",
  "payment_submitted",
  "payment_approved",
  "payment_rejected",
  "delivery_completed",
] as const;
export type NotificationKind = (typeof notificationKinds)[number];
const titles: Record<NotificationKind, string> = {
  order_created: "Order received",
  payment_submitted: "Payment submitted",
  payment_approved: "Payment approved",
  payment_rejected: "Payment rejected",
  delivery_completed: "Delivery completed",
};
const bodies: Record<NotificationAudience, Record<NotificationKind, string>> = {
  customer: {
    order_created:
      "We received order #{orderId}. Submit your payment evidence to continue.",
    payment_submitted: "Payment for order #{orderId} is awaiting review.",
    payment_approved:
      "Payment for order #{orderId} is approved. Your products will be delivered manually.",
    payment_rejected:
      "Payment for order #{orderId} was rejected: {reason}. You can resubmit payment evidence.",
    delivery_completed:
      "Your products for order #{orderId} have been delivered.",
  },
  admin: {
    order_created: "New order #{orderId} has been placed.",
    payment_submitted: "Review payment #{paymentId} for order #{orderId}.",
    payment_approved:
      "Payment for order #{orderId} is approved. Manual delivery is required.",
    payment_rejected:
      "Payment #{paymentId} for order #{orderId} was rejected: {reason}.",
    delivery_completed: "Manual delivery for order #{orderId} is complete.",
  },
};
export type NotificationRecord = {
  id: number;
  title: string;
  body: string;
  kind: string;
  audience: NotificationAudience;
  orderId: number | null;
  paymentId: number | null;
  data: Record<string, string | number> | null;
  read: boolean;
  createdAt: string;
};
export function notificationMessage(
  record: Pick<
    NotificationRecord,
    "kind" | "audience" | "data" | "title" | "body"
  >,
  t = createTranslator({})
) {
  const kind = notificationKinds.find(k => k === record.kind);
  if (!kind || !record.data)
    return { title: t(record.title), body: record.body };
  return {
    title: t(titles[kind]),
    body: t(bodies[record.audience][kind], record.data),
  };
}
export function notificationPath(
  record: Pick<
    NotificationRecord,
    "audience" | "orderId" | "paymentId" | "kind"
  >
) {
  if (record.audience === "customer")
    return record.orderId
      ? `/account/purchases#order-${record.orderId}`
      : "/account/notifications";
  if (record.kind === "payment_submitted" && record.paymentId)
    return `/payments?query=${record.paymentId}#payment-${record.paymentId}`;
  return record.orderId
    ? `/orders?query=${record.orderId}#order-${record.orderId}`
    : "/notifications";
}
export const notificationListInput = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(20),
  filter: z.enum(["all", "unread"]).default("all"),
  id: z.coerce.number().int().positive().max(2147483647).optional(),
});
export const notificationReadInput = z.union([
  z
    .object({
      all: z.literal(true),
      throughId: z.number().int().positive().optional(),
    })
    .strict(),
  z.object({ id: z.number().int().positive(), read: z.boolean() }).strict(),
]);
export const notificationPreferencesInput = z
  .object({
    emailEnabled: z.boolean().optional(),
    locale: z.enum(["en", "my", "th", "ja", "zh"]).optional(),
  })
  .strict();
export type NotificationList = {
  notifications: NotificationRecord[];
  unreadCount: number;
  total: number;
  page: number;
  pages: number;
};
export type NotificationSettings = {
  emailEnabled: boolean;
  locale: string;
  pushConfigured: boolean;
  emailConfigured: boolean;
  vapidPublicKey: string | null;
};
export type DeliveryFailure = {
  id: number;
  notificationId: number;
  channel: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  audience: NotificationAudience;
  orderId: number | null;
};
