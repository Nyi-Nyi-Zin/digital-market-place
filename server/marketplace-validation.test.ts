import { describe, it, expect } from "vitest";
import {
  productInput,
  checkProduct,
  paymentMethodInput,
  evidenceInput,
} from "../shared/marketplace-validation";
import { validateImageBytes } from "./validation";
const draft = {
  title: "Starter",
  slug: "starter",
  categoryId: 1,
  price: "10.00",
};
describe("marketplace form validation", () => {
  it("accepts drafts without a published file", () =>
    expect(checkProduct(productInput.parse(draft)).status).toBe("draft"));
  it("requires a digital file to publish", () =>
    expect(() =>
      checkProduct(productInput.parse({ ...draft, status: "published" }))
    ).toThrow("digital file"));
  it.each(["-1", "ten", "1.999", "999999999"])(
    "rejects invalid prices %s",
    price => expect(() => productInput.parse({ ...draft, price })).toThrow()
  );
  it("requires a discount below the regular price", () =>
    expect(() =>
      checkProduct(productInput.parse({ ...draft, discountPrice: "10" }))
    ).toThrow("Discount price"));
  it("requires account details for enabled payments", () =>
    expect(() =>
      paymentMethodInput.parse({
        name: "KBZPay",
        enabled: true,
        accountName: "",
        accountNumber: "",
      })
    ).toThrow());
  it("allows a disabled payment method without account details", () =>
    expect(
      paymentMethodInput.parse({
        name: "KBZPay",
        enabled: false,
        accountName: "",
        accountNumber: "",
      }).enabled
    ).toBe(false));
  it("rejects a spoofed image MIME type", () =>
    expect(() =>
      validateImageBytes("image/png", Buffer.from("this is not an image"))
    ).toThrow("contents"));
  it("accepts the supported PNG signature", () =>
    expect(
      validateImageBytes(
        "image/png",
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1])
      )
    ).toBe(true));
});
