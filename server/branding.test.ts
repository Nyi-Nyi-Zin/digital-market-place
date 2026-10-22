import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
describe("Cloud Nine branding", () => {
  it("sets the public title in Next.js metadata", () => {
    expect(
      readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8")
    ).toContain("Cloud Nine");
  });
});
