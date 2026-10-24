import { NextResponse } from "next/server";
import { z } from "zod";
import { notificationIdentity } from "./next-auth";
import {
  listNotifications,
  updateNotificationRead,
  getNotificationPreferences,
  saveNotificationPreferences,
  registerPush,
  removePush,
  failedNotificationDeliveries,
  retryNotificationDelivery,
  activePushDeviceHash,
} from "./notifications";
import { fail, HttpError, readJson } from "./http";
import type { NotificationAudience } from "@marketplace/shared/notifications";

const json = (value: unknown) =>
  NextResponse.json(value, {
    headers: { "Cache-Control": "private, no-store" },
  });
const privateFailure = (error: unknown) => {
  const response = fail(error);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
};
function checkOrigin(request: Request, audience: NotificationAudience) {
  const configured =
    audience === "admin"
      ? process.env.NEXT_PUBLIC_ADMIN_URL
      : process.env.NEXT_PUBLIC_CUSTOMER_URL;
  const expected = new URL(
    configured ??
      (audience === "admin" ? "http://localhost:3001" : "http://localhost:3000")
  ).origin;
  if (
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (request.headers.get("origin") &&
      request.headers.get("origin") !== expected)
  )
    throw new HttpError(403, "Invalid request origin");
}
export function notificationHandlers(audience: NotificationAudience) {
  return {
    GET: async (request: Request) => {
      try {
        const { user } = await notificationIdentity(audience);
        return json(
          await listNotifications(
            user.id,
            audience,
            Object.fromEntries(new URL(request.url).searchParams)
          )
        );
      } catch (error) {
        return privateFailure(error);
      }
    },
    PATCH: async (request: Request) => {
      try {
        checkOrigin(request, audience);
        const { user } = await notificationIdentity(audience);
        // Keep the original empty PATCH as mark-all-read; malformed JSON still fails.
        const input =
          !request.body || request.headers.get("content-length") === "0"
            ? { all: true }
            : await readJson(request, 4096);
        await updateNotificationRead(user.id, audience, input);
        return json({ success: true });
      } catch (error) {
        return privateFailure(error);
      }
    },
  };
}
export function notificationPreferenceHandlers(audience: NotificationAudience) {
  return {
    GET: async () => {
      try {
        const { user } = await notificationIdentity(audience);
        return json(await getNotificationPreferences(user.id, audience));
      } catch (error) {
        return privateFailure(error);
      }
    },
    PATCH: async (request: Request) => {
      try {
        checkOrigin(request, audience);
        const { user } = await notificationIdentity(audience);
        return json(
          await saveNotificationPreferences(
            user.id,
            audience,
            await readJson(request, 4096)
          )
        );
      } catch (error) {
        return privateFailure(error);
      }
    },
  };
}
export function pushSubscriptionHandlers(audience: NotificationAudience) {
  return {
    GET: async (request: Request) => {
      try {
        const { user, sessionId } = await notificationIdentity(audience);
        const device = new URL(request.url).searchParams.get("device");
        if (!device || !/^[a-f0-9]{64}$/.test(device))
          throw new HttpError(400, "Invalid push endpoint");
        return json({
          active: await activePushDeviceHash(
            user.id,
            audience,
            sessionId,
            device
          ),
        });
      } catch (error) {
        return privateFailure(error);
      }
    },
    POST: async (request: Request) => {
      try {
        checkOrigin(request, audience);
        const { user, sessionId } = await notificationIdentity(audience);
        await registerPush(
          user.id,
          audience,
          sessionId,
          await readJson(request, 8192)
        );
        return json({ success: true });
      } catch (error) {
        return privateFailure(error);
      }
    },
    DELETE: async (request: Request) => {
      try {
        checkOrigin(request, audience);
        const { user, sessionId } = await notificationIdentity(audience);
        const { endpoint } = z
          .object({ endpoint: z.string().max(2048) })
          .strict()
          .parse(await readJson(request, 4096));
        await removePush(user.id, audience, sessionId, endpoint);
        return json({ success: true });
      } catch (error) {
        return privateFailure(error);
      }
    },
  };
}
export async function deliveryFailuresGET(request: Request) {
  try {
    await notificationIdentity("admin");
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(100000)
      .parse(new URL(request.url).searchParams.get("page") ?? 1);
    return json(await failedNotificationDeliveries(page));
  } catch (error) {
    return privateFailure(error);
  }
}
export async function deliveryFailuresPATCH(request: Request) {
  try {
    checkOrigin(request, "admin");
    await notificationIdentity("admin");
    const { id } = z
      .object({ id: z.number().int().positive() })
      .strict()
      .parse(await readJson(request, 4096));
    await retryNotificationDelivery(id);
    return json({ success: true });
  } catch (error) {
    return privateFailure(error);
  }
}
