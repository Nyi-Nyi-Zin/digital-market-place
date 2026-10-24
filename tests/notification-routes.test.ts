import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  identity: vi.fn(),
  list: vi.fn(),
  read: vi.fn(),
  register: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@marketplace/server/next-auth", () => ({
  notificationIdentity: mocks.identity,
}));
vi.mock("@marketplace/server/notifications", () => ({
  listNotifications: mocks.list,
  updateNotificationRead: mocks.read,
  registerPush: mocks.register,
  removePush: mocks.remove,
  getNotificationPreferences: vi.fn(),
  saveNotificationPreferences: vi.fn(),
  failedNotificationDeliveries: vi.fn(),
  retryNotificationDelivery: vi.fn(),
}));
import {
  notificationHandlers,
  pushSubscriptionHandlers,
} from "@marketplace/server/notification-http";
const customer = notificationHandlers("customer"),
  admin = notificationHandlers("admin");
describe("notification HTTP boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.identity.mockResolvedValue({
      user: { id: 12 },
      sessionId: "current-session",
    });
    mocks.list.mockResolvedValue({
      notifications: [],
      unreadCount: 0,
      total: 0,
      page: 1,
      pages: 1,
    });
  });
  it("returns private 401/403 responses instead of exposing inbox data", async () => {
    mocks.identity.mockRejectedValueOnce(
      new Response("Sign in", { status: 401 })
    );
    const response = await customer.GET(
      new Request("http://localhost:3000/api/notifications")
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    mocks.identity.mockRejectedValueOnce(
      new Response("Admin required", { status: 403 })
    );
    expect(
      (
        await admin.GET(
          new Request("http://localhost:3001/api/admin/notifications")
        )
      ).status
    ).toBe(403);
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it("derives owner and audience from the current site/session", async () => {
    const response = await admin.GET(
      new Request(
        "http://localhost:3001/api/admin/notifications?page=2&userId=99"
      )
    );
    expect(response.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith(12, "admin", {
      page: "2",
      userId: "99",
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("keeps empty PATCH compatible and rejects malformed JSON", async () => {
    expect(
      (
        await customer.PATCH(
          new Request("http://localhost:3000/api/notifications", {
            method: "PATCH",
          })
        )
      ).status
    ).toBe(200);
    expect(mocks.read).toHaveBeenCalledWith(12, "customer", { all: true });
    expect(
      (
        await customer.PATCH(
          new Request("http://localhost:3000/api/notifications", {
            method: "PATCH",
            body: "invalid-json",
          })
        )
      ).status
    ).toBe(400);
    expect(mocks.read).toHaveBeenCalledTimes(1);
  });
  it("rejects cross-origin read mutations and subscription writes", async () => {
    const request = () =>
      new Request("http://localhost:3000/api/notifications", {
        method: "PATCH",
        headers: { origin: "https://evil.test" },
        body: JSON.stringify({ all: true }),
      });
    expect((await customer.PATCH(request())).status).toBe(403);
    expect(
      (await pushSubscriptionHandlers("customer").POST(request())).status
    ).toBe(403);
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.register).not.toHaveBeenCalled();
  });
  it("never registers a push subscription for an anonymous caller", async () => {
    mocks.identity.mockRejectedValueOnce(
      new Response("Sign in", { status: 401 })
    );
    expect(
      (
        await pushSubscriptionHandlers("customer").POST(
          new Request("http://localhost:3000/api/push-subscriptions", {
            method: "POST",
            body: "{}",
          })
        )
      ).status
    ).toBe(401);
    expect(mocks.register).not.toHaveBeenCalled();
  });
  it("reports server failures as 500 rather than authentication failures", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.list.mockRejectedValueOnce(new Error("database unavailable"));
    expect(
      (
        await customer.GET(
          new Request("http://localhost:3000/api/notifications")
        )
      ).status
    ).toBe(500);
    log.mockRestore();
  });
});
