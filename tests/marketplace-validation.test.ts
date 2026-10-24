import { describe, it, expect } from "vitest";
import {
  productInput,
  categoryInput,
  checkProduct,
  paymentMethodInput,
  evidenceInput,
} from "@marketplace/shared/marketplace-validation";
import { validateImageBytes } from "@marketplace/server/validation";
const draft = {
  title: "Starter",
  categoryId: 1,
  price: "10.00",
};
describe("marketplace form validation", () => {
  it("creates products without a slug or version and ignores client overrides", () => {
    const input = productInput.parse({
      ...draft,
      slug: "client-url",
      version: "9.0",
      rating: 5,
    });
    expect(input).not.toHaveProperty("slug");
    expect(input).not.toHaveProperty("version");
    expect(input).not.toHaveProperty("rating");
  });
  it("creates categories without asking for a slug", () => {
    expect(categoryInput.parse({ name: "Design", slug: "client-url" })).toEqual(
      { name: "Design", description: "" }
    );
  });
  it("accepts drafts without a published file", () =>
    expect(checkProduct(productInput.parse(draft)).status).toBe("draft"));
  it("publishes products for manual delivery without a digital file", () => {
    const product = checkProduct(
      productInput.parse({ ...draft, status: "published" })
    );
    expect(product.status).toBe("published");
    expect(product.digitalFileKey).toBeNull();
  });
  it("accepts the archived product lifecycle state", () => {
    expect(productInput.parse({ ...draft, status: "archived" }).status).toBe(
      "archived"
    );
    expect(
      checkProduct(
        productInput.parse({ ...draft, status: "archived", featured: true })
      ).featured
    ).toBe(false);
  });
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
