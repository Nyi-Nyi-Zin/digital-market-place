import { describe, expect, it } from "vitest";
import {
  csvCell,
  newTicketInput,
  reportInput,
  documentInput,
  defaultDocuments,
  settingsInput,
  defaultSettings,
} from "@marketplace/shared/store";
describe("store input and export rules", () => {
  it("rejects invalid calendar dates, reversed and excessive report ranges", () => {
    for (const input of [
      { from: "2026-02-30", to: "2026-03-01" },
      { from: "2026-10-25", to: "2026-10-01" },
      { from: "2025-01-01", to: "2026-10-25" },
    ])
      expect(reportInput.safeParse(input).success).toBe(false);
    expect(
      reportInput.parse({ from: "2026-10-25", to: "2026-10-25" }).from
    ).toBe("2026-10-25");
  });
  it("escapes quotes, commas, newlines and spreadsheet formulas", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    for (const value of [
      "=HYPERLINK(1)",
      "+cmd",
      "-cmd",
      "@SUM(1)",
      "\t=cmd",
      "\r=cmd",
    ])
      expect(csvCell(value).startsWith("\"'")).toBe(true);
    expect(csvCell("Myanmar\nproduct")).toBe('"Myanmar\nproduct"');
  });
  it("bounds ticket content and only accepts safe configurable contact links", () => {
    expect(
      newTicketInput.safeParse({ subject: "   ", message: "Help" }).success
    ).toBe(false);
    expect(
      newTicketInput.safeParse({
        subject: "Payment help",
        message: "Help",
        orderId: -1,
      }).success
    ).toBe(false);
    expect(
      settingsInput.safeParse({
        ...defaultSettings,
        telegramUsername: "https://evil.test",
      }).success
    ).toBe(false);
    expect(
      settingsInput.safeParse({
        ...defaultSettings,
        supportEmail: "a@example.test\nBcc:x@example.test",
      }).success
    ).toBe(false);
    for (const document of Object.values(defaultDocuments))
      expect(documentInput.safeParse(document).success).toBe(true);
  });
});
