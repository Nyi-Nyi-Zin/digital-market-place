import { describe, expect, it } from "vitest";
import {
  adminListInput,
  adminFilterQuery,
  emptyAdminFilters,
  paginationFor,
  paginationItems,
} from "@marketplace/shared/pagination";

describe("pagination boundaries and navigation", () => {
  it("keeps empty results on a single empty first page", () => {
    expect(paginationFor(0, 999)).toEqual({
      page: 1,
      pages: 1,
      total: 0,
      pageSize: 12,
    });
  });
  it("clamps an obsolete page after the last record is removed", () => {
    expect(paginationFor(24, 3).page).toBe(2);
    expect(paginationFor(25, 3).page).toBe(3);
  });
  it("rejects invalid pages and unsupported sections or status values", () => {
    for (const page of ["0", "-1", "1.5", "NaN", "Infinity", "2147483648"])
      expect(adminListInput.safeParse({ page }).success).toBe(false);
    expect(adminListInput.safeParse({ section: "users" }).success).toBe(false);
    expect(adminListInput.safeParse({ status: "invalid" }).success).toBe(false);
    expect(adminListInput.safeParse({ query: "x".repeat(201) }).success).toBe(
      false
    );
    expect(
      adminListInput.parse({ page: "2", query: "  resource  " })
    ).toMatchObject({ page: 2, query: "resource" });
  });
  it("uses bounded page links with no duplicates at both ends and in the middle", () => {
    expect(paginationItems(1, 78)).toEqual([1, 2, 3, "end-gap", 78]);
    expect(paginationItems(40, 78)).toEqual([
      1,
      "start-gap",
      39,
      40,
      41,
      "end-gap",
      78,
    ]);
    expect(paginationItems(78, 78)).toEqual([1, "start-gap", 76, 77, 78]);
    expect(paginationItems(1, 1)).toEqual([1]);
    for (let page = 1; page <= 78; page++) {
      const items = paginationItems(page, 78);
      const numbers = items.filter(item => typeof item === "number");
      expect(items.length).toBeLessThanOrEqual(7);
      expect(numbers).toContain(page);
      expect(new Set(numbers).size).toBe(numbers.length);
    }
  });
  it("accepts creation timestamps with explicit timezones and inclusive value bounds", () => {
    expect(
      adminFilterQuery({
        ...emptyAdminFilters,
        createdFrom: "2026-10-24T00:00:00+06:30",
        createdTo: "2026-10-24T23:59:59+06:30",
      })
    ).toMatchObject({
      createdFrom: "2026-10-23T17:30:00.000Z",
      createdTo: "2026-10-24T17:29:59.999Z",
    });
    expect(
      adminListInput.parse({
        section: "products",
        status: "archived",
        createdFrom: "2026-10-24T00:00:00+06:30",
        createdTo: "2026-10-24T23:59:59+06:30",
        minValue: "0",
        maxValue: "10.50",
      })
    ).toMatchObject({ minValue: "0", maxValue: "10.50", status: "archived" });
    for (const status of [
      "payment_pending",
      "paid",
      "completed",
      "payment_rejected",
    ])
      expect(
        adminListInput.safeParse({ section: "orders", status }).success
      ).toBe(true);
    expect(
      adminListInput.safeParse({ section: "orders", status: "approved" })
        .success
    ).toBe(true);
  });
  it("rejects malformed/reversed ranges and cross-section statuses", () => {
    const invalid = [
      { createdFrom: "2026-02-30T12:00:00Z" },
      { createdFrom: "2026-10-24T00:00:00" },
      {
        createdFrom: "2026-10-25T00:00:00Z",
        createdTo: "2026-10-24T00:00:00Z",
      },
      { minValue: "5", maxValue: "4" },
      { minValue: "-1" },
      { maxValue: "NaN" },
      { minValue: "1.001" },
      { status: "paid" },
    ];
    for (const input of invalid)
      expect(
        adminListInput.safeParse({ section: "products", ...input }).success
      ).toBe(false);
    expect(
      adminListInput.safeParse({ section: "payments", status: "archived" })
        .success
    ).toBe(false);
    expect(
      adminListInput.safeParse({ section: "categories", minValue: "1" }).success
    ).toBe(false);
    expect(
      adminListInput.parse({
        section: "products",
        minValue: "",
        createdFrom: "",
      }).minValue
    ).toBeUndefined();
  });
});
