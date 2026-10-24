import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  user: vi.fn(),
  admin: vi.fn(),
  detail: vi.fn(),
  tickets: vi.fn(),
  reply: vi.fn(),
  create: vi.fn(),
  save: vi.fn(),
  report: vi.fn(),
}));
vi.mock("@marketplace/server/next-auth", () => ({
  requireUser: mock.user,
  requireAdmin: mock.admin,
}));
vi.mock("@marketplace/server/operations", () => ({
  orderDetail: mock.detail,
  adminOrderDetail: vi.fn(),
  addOrderNote: vi.fn(),
  listCustomers: vi.fn(),
  customerDetail: vi.fn(),
  listActivity: vi.fn(),
  salesReport: mock.report,
  reportCsv: vi.fn(() => "csv"),
}));
vi.mock("@marketplace/server/support", () => ({
  createTicket: mock.create,
  listTickets: mock.tickets,
  ticketDetail: vi.fn(),
  replyToTicket: mock.reply,
  changeTicketStatus: vi.fn(),
}));
vi.mock("@marketplace/server/store", () => ({
  getStoreSettings: vi.fn(),
  getStoreDocument: vi.fn(),
  saveStoreSettings: vi.fn(),
  saveStoreDocument: mock.save,
}));
import {
  orderHandlers,
  supportHandlers,
  supportDetailHandlers,
  contentHandlers,
  reportsHandler,
  customersHandler,
} from "@marketplace/server/operations-http";
const context = (id: string) => ({ params: Promise.resolve({ id }) });
describe("store operations HTTP boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.user.mockResolvedValue({ id: 12 });
    mock.detail.mockResolvedValue({});
    mock.tickets.mockResolvedValue({});
    mock.reply.mockResolvedValue({ success: true });
    mock.admin.mockResolvedValue({ id: 3, role: "admin" });
  });
  it("protects admin routes and does not cache denied responses", async () => {
    mock.admin.mockRejectedValueOnce(new Response("Admin", { status: 403 }));
    const response = await customersHandler(
      new Request("http://localhost/api/admin/customers")
    );
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("binds customer order and support reads to the session owner", async () => {
    await orderHandlers("customer").GET(
      new Request("http://localhost/api/orders/4?userId=99"),
      context("4")
    );
    expect(mock.detail).toHaveBeenCalledWith(4, 12);
    await supportHandlers("customer").GET(
      new Request("http://localhost/api/support?userId=99")
    );
    expect(mock.tickets).toHaveBeenCalledWith(12, { userId: "99" });
  });
  it("rejects malformed IDs before reading order data", async () => {
    const response = await orderHandlers("customer").GET(
      new Request("http://localhost/api/orders/1.5"),
      context("1.5")
    );
    expect(response.status).toBe(400);
    expect(mock.detail).not.toHaveBeenCalled();
  });
  it("rejects cross-origin writes and does not mutate", async () => {
    const response = await contentHandlers.PATCH(
      new Request("http://localhost/api/admin/content", {
        method: "PATCH",
        headers: { origin: "https://evil.test" },
        body: "{}",
      })
    );
    expect(response.status).toBe(403);
    expect(mock.save).not.toHaveBeenCalled();
  });
  it("binds customer replies to the session without accepting a claimed admin audience", async () => {
    await supportDetailHandlers("customer").POST(
      new Request("http://localhost/api/support/5", {
        method: "POST",
        body: JSON.stringify({
          message: "hello",
          audience: "admin",
          authorId: 3,
        }),
      }),
      context("5")
    );
    expect(mock.reply).toHaveBeenCalledWith(
      5,
      12,
      "customer",
      expect.objectContaining({ message: "hello" })
    );
  });
  it("authenticates anonymous support creation and rejects invalid JSON", async () => {
    mock.user.mockRejectedValueOnce(new Response("Sign in", { status: 401 }));
    expect(
      (
        await supportHandlers("customer").POST(
          new Request("http://localhost/api/support", {
            method: "POST",
            body: "{}",
          })
        )
      ).status
    ).toBe(401);
    expect(
      (
        await supportHandlers("customer").POST(
          new Request("http://localhost/api/support", {
            method: "POST",
            body: "{",
          })
        )
      ).status
    ).toBe(400);
    expect(mock.create).not.toHaveBeenCalled();
  });
  it("exports reports as private CSV attachments", async () => {
    mock.report.mockResolvedValue({ from: "2026-10-01", to: "2026-10-25" });
    const response = await reportsHandler(
      new Request(
        "http://localhost/api/admin/reports?from=2026-10-01&to=2026-10-25&format=csv"
      )
    );
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
