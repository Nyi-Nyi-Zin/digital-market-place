import { describe, expect, it } from "vitest";

describe("Cloud Nine branding configuration", () => {
  it("exposes the configured public site title", () => {
    expect(process.env.VITE_APP_TITLE).toBe("Cloud Nine");
  });
});
