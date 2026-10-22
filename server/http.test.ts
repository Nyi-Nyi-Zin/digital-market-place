import { describe, it, expect } from "vitest";
import { readJson, readBody } from "./http";
describe("bounded request bodies", () => {
  it("parses a JSON body", async () =>
    expect(
      await readJson(
        new Request("http://localhost", { method: "POST", body: '{"value":1}' })
      )
    ).toEqual({ value: 1 }));
  it("rejects invalid JSON", async () =>
    expect(
      readJson(
        new Request("http://localhost", { method: "POST", body: "not-json" })
      )
    ).rejects.toThrow("Invalid JSON"));
  it("rejects oversized bodies even without a content-length header", async () =>
    expect(
      readBody(
        new Request("http://localhost", { method: "POST", body: "12345" }),
        4
      )
    ).rejects.toThrow("too large"));
});
