import { describe, expect, it } from "vitest";
import { safeNextPath } from "@marketplace/shared/redirect";
describe("post-login redirects", () => {
  it("returns to the admin home for missing or unsafe admin return paths", () => {
    expect(safeNextPath(undefined, "/")).toBe("/");
    expect(safeNextPath("//evil.example", "/")).toBe("/");
    expect(safeNextPath("/products?status=draft", "/")).toBe(
      "/products?status=draft"
    );
  });
  it("allows local return paths", () =>
    expect(safeNextPath("/admin?tab=orders")).toBe("/admin?tab=orders"));
  it.each([
    "//evil.example",
    "https://evil.example",
    "/\\evil.example",
    "/\nevil.example",
    "",
    undefined,
  ])("rejects an external or malformed return path: %s", value =>
    expect(safeNextPath(value)).toBe("/account")
  );
});
