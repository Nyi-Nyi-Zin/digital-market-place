import { beforeEach, describe, expect, it, vi } from "vitest";
import { products } from "@marketplace/server/schema";
import { HttpError } from "@marketplace/server/http";

const mocks = vi.hoisted(() => ({
  limit: vi.fn(),
  requireUser: vi.fn(),
  approved: vi.fn(),
  sign: vi.fn(),
  record: vi.fn(),
  order: vi.fn(),
}));
vi.mock("@marketplace/server/next-auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@marketplace/server/storage", () => ({ storageGetSignedUrl: mocks.sign }));
vi.mock("@marketplace/server/db", () => ({
  products,
  isApprovedOwner: mocks.approved,
  recordDownload: mocks.record,
  getApprovedOrderForProduct: mocks.order,
  getDb: () => ({
    select: () => ({ from: () => ({ where: () => ({ limit: mocks.limit }) }) }),
  }),
}));
import { POST } from "../customer-web/app/api/download/[productId]/route";
const key = "cloudinary/raw/authenticated/product-files/book.pdf";
const request = () =>
  POST(new Request("http://localhost/api/download/2", { method: "POST" }), {
    params: Promise.resolve({ productId: "2" }),
  });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireUser.mockResolvedValue({ id: 1, role: "user" });
  mocks.approved.mockResolvedValue(true);
  mocks.limit.mockResolvedValue([{ digitalFileKey: key }]);
  mocks.order.mockResolvedValue({ id: 3 });
  mocks.sign.mockResolvedValue("https://api.cloudinary.com/temporary-download");
});
describe("paid download route", () => {
  it("returns a temporary URL only to approved owners, with caching disabled", async () => {
    const response = await request();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      url: "https://api.cloudinary.com/temporary-download",
    });
    expect(mocks.sign).toHaveBeenCalledWith(key);
    expect(mocks.record).toHaveBeenCalledWith(1, 2, 3);
  });
  it("denies unapproved customers without issuing a URL or recording a download", async () => {
    mocks.approved.mockResolvedValue(false);
    expect((await request()).status).toBe(403);
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(mocks.record).not.toHaveBeenCalled();
  });
  it("does not count failed storage requests as downloads", async () => {
    mocks.sign.mockRejectedValue(
      new HttpError(503, "Cloudinary storage is not configured")
    );
    const response = await request();
    expect(response.status).toBe(503);
    expect(mocks.record).not.toHaveBeenCalled();
  });
});
