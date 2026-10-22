import { describe, expect, it } from "vitest";
import { safeNextPath } from "../app/lib/redirect";
describe("post-login redirects", () => {
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
