import { notificationPreferenceHandlers } from "@marketplace/server/notification-http";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const { GET, PATCH } = notificationPreferenceHandlers("customer");
