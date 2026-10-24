import { describe, expect, it } from "vitest";
import {
  notificationMessage,
  notificationPath,
  notificationReadInput,
  notificationListInput,
  notificationKinds,
} from "@marketplace/shared/notifications";
import {
  validPushEndpoint,
  publicPushAddress,
  pushSubscriptionInput,
} from "@marketplace/server/push-validation";
import {
  notificationEmail,
  retryDelays,
  workerAuthorized,
} from "@marketplace/server/notification-worker";
import { locales, createTranslator } from "@marketplace/shared/i18n";
import { dictionaries } from "@marketplace/shared/locales";

describe("notification contracts and security", () => {
  it("renders all event types for both audiences in all languages", () => {
    for (const locale of locales)
      for (const audience of ["customer", "admin"] as const)
        for (const kind of notificationKinds) {
          const message = notificationMessage(
            {
              kind,
              audience,
              data: { orderId: 123, paymentId: 456, reason: "Test reason" },
              title: "",
              body: "",
            },
            createTranslator(dictionaries[locale])
          );
          expect(message.title).toBeTruthy();
          expect(message.body).toContain("123");
          expect(message.body).not.toMatch(/\{\w+\}/);
          if (locale !== "en")
            expect(message).not.toEqual(
              notificationMessage({
                kind,
                audience,
                data: { orderId: 123, paymentId: 456, reason: "Test reason" },
                title: "",
                body: "",
              })
            );
        }
  });
  it("preserves legacy text and creates internal target links", () => {
    expect(
      notificationMessage(
        {
          kind: "old",
          audience: "customer",
          data: null,
          title: "Legacy",
          body: "Original",
        },
        createTranslator(dictionaries.my)
      )
    ).toEqual({ title: "Legacy", body: "Original" });
    expect(
      notificationPath({
        kind: "payment_submitted",
        audience: "admin",
        orderId: 7,
        paymentId: 9,
      })
    ).toBe("/payments?query=9#payment-9");
    expect(
      notificationPath({
        kind: "payment_approved",
        audience: "admin",
        orderId: 7,
        paymentId: 9,
      })
    ).toBe("/orders?query=7#order-7");
    expect(
      notificationPath({
        kind: "delivery_completed",
        audience: "customer",
        orderId: 7,
        paymentId: null,
      })
    ).toBe("/account/purchases#order-7");
  });
  it("limits pagination and accepts only explicit read actions", () => {
    for (const input of [
      { limit: 100 },
      { page: -1 },
      { filter: "other" },
      { id: "not-id" },
    ])
      expect(notificationListInput.safeParse(input).success).toBe(false);
    expect(notificationReadInput.safeParse({ all: true }).success).toBe(true);
    expect(
      notificationReadInput.safeParse({ id: 1, read: false }).success
    ).toBe(true);
    expect(
      notificationReadInput.safeParse({ all: true, userId: 2 }).success
    ).toBe(false);
  });
  it("allows browser push services and rejects SSRF and credential injection", () => {
    for (const endpoint of [
      "https://fcm.googleapis.com/fcm/send/test",
      "https://updates.push.services.mozilla.com/wpush/v2/test",
      "https://web.push.apple.com/test",
    ])
      expect(validPushEndpoint(endpoint)).toBe(true);
    for (const endpoint of [
      "http://fcm.googleapis.com/test",
      "https://127.0.0.1/test",
      "https://169.254.169.254/latest",
      "https://example.org",
      "https://fcm.googleapis.com.evil.test/test",
      "https://fcm.googleapis.com@localhost/test",
      "https://user@fcm.googleapis.com/test",
      "https://web.push.apple.com:444/test",
      "https://web.push.apple.com/#test",
    ])
      expect(validPushEndpoint(endpoint)).toBe(false);
    for (const address of [
      "127.0.0.1",
      "10.0.0.1",
      "172.16.0.1",
      "192.168.0.1",
      "169.254.1.1",
      "100.64.0.1",
      "::1",
      "::ffff:127.0.0.1",
      "fc00::1",
      "fe80::1",
      "2001:db8::1",
    ])
      expect(publicPushAddress(address)).toBe(false);
    expect(publicPushAddress("8.8.8.8")).toBe(true);
    expect(publicPushAddress("2606:4700::1111")).toBe(true);
    expect(
      pushSubscriptionInput.safeParse({
        endpoint: "https://fcm.googleapis.com/test",
        keys: { p256dh: "short", auth: "short" },
      }).success
    ).toBe(false);
  });
  it("escapes customer content in emails and requires a strong worker secret", () => {
    const email = notificationEmail(
      "<script>",
      'Reason: <img src=x onerror="alert(1)">',
      "https://example.test/?a=1&b=2",
      "View update"
    );
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<img");
    expect(email.html).toContain("&lt;img");
    expect(email.text).toContain("<img");
    const secret = "a".repeat(40);
    expect(workerAuthorized(`Bearer ${secret}`, secret)).toBe(true);
    expect(workerAuthorized(`Bearer ${secret}x`, secret)).toBe(false);
    expect(workerAuthorized("Bearer short", "short")).toBe(false);
    expect(workerAuthorized(null, secret)).toBe(false);
    expect(retryDelays).toHaveLength(5);
  });
});
