import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { products, payments } from "@marketplace/server/schema";

const mocks = vi.hoisted(() => ({
  limit: vi.fn(),
  requireUser: vi.fn(),
  approved: vi.fn(),
  sign: vi.fn(),
}));
vi.mock("@marketplace/server/next-auth", () => ({
  requireUser: mocks.requireUser,
}));
vi.mock("@marketplace/server/db", () => ({
  products,
  payments,
  isApprovedOwner: mocks.approved,
  getDb: () => ({
    select: () => ({ from: () => ({ where: () => ({ limit: mocks.limit }) }) }),
  }),
}));
vi.mock("@marketplace/server/storage", async importOriginal => ({
  ...(await importOriginal<typeof import("@marketplace/server/storage")>()),
  storageGetSignedUrl: mocks.sign,
}));
import { GET as customerGET } from "../customer-web/app/storage/[...key]/route";
import { GET as adminGET } from "../admin/app/storage/[...key]/route";

const screenshot = "cloudinary/image/authenticated/payment-screenshots/1/2.png";
const digital = "cloudinary/raw/authenticated/product-files/book.pdf";
const thumbnail = "cloudinary/image/upload/product-thumbnails/test.png";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.sign.mockResolvedValue("https://api.cloudinary.com/authorized-file");
  mocks.requireUser.mockResolvedValue({ id: 1, role: "user" });
  mocks.limit.mockResolvedValue([]);
});
afterEach(() => vi.restoreAllMocks());

describe.each([
  ["customer", customerGET],
  ["admin", adminGET],
] as const)("storage route access (%s)", (_site, GET) => {
  function request(key: string) {
    return GET(new Request(`http://localhost/storage/${key}`), {
      params: Promise.resolve({ key: key.split("/") }),
    });
  }
  it("allows a referenced public thumbnail without a session", async () => {
    mocks.limit.mockResolvedValueOnce([{ id: 2 }]);
    const response = await request(thumbnail);
    expect(response.status).toBe(307);
    expect(mocks.requireUser).not.toHaveBeenCalled();
  });
  it("requires a session for private screenshots", async () => {
    mocks.requireUser.mockRejectedValue(new Response(null, { status: 401 }));
    const response = await request(screenshot);
    expect(response.status).toBe(401);
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("allows screenshot owners", async () => {
    mocks.limit
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ userId: 1 }]);
    expect((await request(screenshot)).status).toBe(307);
  });
  it("denies another customer's screenshot", async () => {
    mocks.limit
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ userId: 2 }]);
    expect((await request(screenshot)).status).toBe(403);
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("does not make authenticated evidence public through the thumbnail lookup", async () => {
    mocks.requireUser.mockRejectedValue(new Response(null, { status: 401 }));
    mocks.limit.mockResolvedValue([{ id: 5 }]);
    expect((await request(screenshot)).status).toBe(401);
    expect(mocks.limit).not.toHaveBeenCalled();
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("allows administrators to preview newly uploaded files", async () => {
    mocks.requireUser.mockResolvedValue({ id: 3, role: "admin" });
    expect((await request(digital)).status).toBe(307);
    expect(mocks.limit).not.toHaveBeenCalled();
  });
  it.each([true, false])(
    "requires approved ownership for product downloads: %s",
    async approved => {
      mocks.limit.mockResolvedValueOnce([{ id: 7 }]).mockResolvedValueOnce([]);
      mocks.approved.mockResolvedValue(approved);
      const response = await request(digital);
      expect(response.status).toBe(approved ? 307 : 403);
      expect(mocks.approved).toHaveBeenCalledWith(1, 7);
      expect(mocks.sign).toHaveBeenCalledTimes(approved ? 1 : 0);
    }
  );
  it("rejects legacy keys without querying storage or the database", async () => {
    expect((await request("product-thumbnails/old.png")).status).toBe(404);
    expect(mocks.limit).not.toHaveBeenCalled();
    expect(mocks.sign).not.toHaveBeenCalled();
  });
});
