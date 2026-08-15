import { describe, expect, it } from "vitest";
import { calculateServerTotal, MAX_SCREENSHOT_BYTES, validateScreenshot, NOTIFICATION_KINDS, assertApprovedDownload } from "./validation";

describe("marketplace security validation", () => {
  it("accepts the supported screenshot formats up to 5 MB", () => {
    expect(validateScreenshot("image/jpeg", MAX_SCREENSHOT_BYTES)).toBe(true);
    expect(validateScreenshot("image/png", MAX_SCREENSHOT_BYTES)).toBe(true);
    expect(validateScreenshot("image/webp", MAX_SCREENSHOT_BYTES)).toBe(true);
  });
  it("rejects unsupported screenshot formats and oversized uploads", () => {
    expect(() => validateScreenshot("application/pdf", 10)).toThrow("Unsupported screenshot type");
    expect(() => validateScreenshot("image/png", MAX_SCREENSHOT_BYTES + 1)).toThrow("5 MB");
  });
  it("rejects downloads until payment approval exists", () => {
    expect(() => assertApprovedDownload(false)).toThrow("Payment approval required");
    expect(assertApprovedDownload(true)).toBe(true);
  });
  it("covers the notification event contract", () => {
    expect(NOTIFICATION_KINDS).toEqual(["payment_submitted", "payment_approved", "payment_rejected", "product_purchased", "product_updated"]);
  });
  it("calculates totals from server-trusted discounted prices", () => {
    expect(calculateServerTotal([{ price: 29, discountPrice: 19 }, { price: 12, quantity: 1 }])).toBe(31);
  });
});
