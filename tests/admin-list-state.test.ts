import { describe, it, expect } from "vitest";
import {
  adminFilterQuery,
  adminListInput,
  emptyAdminFilters,
} from "@marketplace/shared/pagination";
import {
  adminListUrl,
  readAdminListState,
  defaultAdminListState,
  quickDateRange,
  detectQuickDate,
  activeAdminFilterKeys,
  removeAdminFilter,
} from "@marketplace/shared/admin-list-state";

describe("admin list state and URL persistence", () => {
  it("preserves literal all search text instead of treating it as a selector default", () => {
    const state = { ...defaultAdminListState("products"), search: "all" };
    const url = new URL(
      adminListUrl(
        new URL("https://admin.example/products"),
        "products",
        state
      ),
      "https://admin.example"
    );
    expect(url.searchParams.get("query")).toBe("all");
    expect(readAdminListState(url.searchParams, "products").state.search).toBe(
      "all"
    );
  });
  it("round-trips active criteria, UTC boundaries, zero value, sort and page while retaining unrelated parameters/hash", () => {
    const state = {
      ...defaultAdminListState("products"),
      search: "Starter",
      page: 3,
      sort: "value_asc" as const,
      filters: {
        ...emptyAdminFilters,
        status: "published",
        categoryId: "2",
        featured: "no",
        discount: "discounted",
        minValue: "0",
        maxValue: "20.50",
        createdFrom: "2026-10-24T00:00:00+06:30",
        createdTo: "2026-10-24T23:59:59+06:30",
      },
    };
    const url = new URL(
      adminListUrl(
        new URL("https://admin.example/products?utm=qa#results"),
        "products",
        state
      ),
      "https://admin.example"
    );
    expect(url.hash).toBe("#results");
    expect(url.searchParams.get("utm")).toBe("qa");
    expect(url.searchParams.get("createdFrom")).toBe(
      "2026-10-23T17:30:00.000Z"
    );
    expect(url.searchParams.get("createdTo")).toBe("2026-10-24T17:29:59.999Z");
    const restored = readAdminListState(url.searchParams, "products");
    expect(restored.invalid).toBe(false);
    expect(restored.state.page).toBe(3);
    expect(restored.state.sort).toBe("value_asc");
    expect(adminFilterQuery(restored.state.filters)).toEqual(
      adminFilterQuery(state.filters)
    );
    expect(restored.state.search).toBe("Starter");
  });
  it("omits cleared/default criteria and uses the existing category name ordering", () => {
    expect(
      adminListUrl(
        new URL(
          "https://admin.example/categories?status=draft&sort=oldest&page=2&query=old#list"
        ),
        "categories",
        defaultAdminListState("categories")
      )
    ).toBe("/categories#list");
    expect(
      readAdminListState(new URLSearchParams(), "categories").state.sort
    ).toBe("name_asc");
  });
  it("recovers from invalid links without issuing malformed criteria", () => {
    for (const query of [
      "createdFrom=bad",
      "status=paid",
      "sort=invalid",
      "page=0",
      "categoryId=-1",
      "minValue=2&maxValue=1",
    ]) {
      const result = readAdminListState(new URLSearchParams(query), "products");
      expect(result.invalid).toBe(true);
      expect(result.state).toEqual(defaultAdminListState("products"));
    }
  });
  it("validates section-specific criteria and sort capabilities", () => {
    expect(
      adminListInput.safeParse({
        section: "products",
        categoryId: "1",
        featured: "yes",
        discount: "discounted",
        sort: "value_desc",
      }).success
    ).toBe(true);
    expect(
      adminListInput.safeParse({
        section: "orders",
        productId: "2",
        sort: "value_asc",
      }).success
    ).toBe(true);
    expect(
      adminListInput.safeParse({
        section: "payments",
        paymentMethod: "KBZPay",
        sort: "oldest",
      }).success
    ).toBe(true);
    for (const input of [
      { section: "payments", categoryId: "1" },
      { section: "products", productId: "1" },
      { section: "orders", paymentMethod: "KBZPay" },
      { section: "categories", sort: "value_asc" },
      { section: "payments", sort: "name_asc" },
      { section: "products", categoryId: "2147483648" },
      { section: "payments", paymentMethod: "invalid" },
    ])
      expect(adminListInput.safeParse(input).success).toBe(false);
  });
  it("groups paired ranges in chips, includes zero and excludes sort; removing one group resets the page and preserves others", () => {
    const state = {
      ...defaultAdminListState("products"),
      page: 4,
      filters: {
        ...emptyAdminFilters,
        categoryId: "1",
        minValue: "0",
        maxValue: "10",
        createdFrom: "2026-10-24T00:00",
        createdTo: "2026-10-24T23:59:59",
      },
    };
    expect(activeAdminFilterKeys(state.search, state.filters)).toEqual([
      "created",
      "value",
      "categoryId",
    ]);
    const next = removeAdminFilter(state, "created");
    expect(next.page).toBe(1);
    expect(next.filters.createdFrom).toBe("");
    expect(next.filters.createdTo).toBe("");
    expect(next.filters.categoryId).toBe("1");
    expect(next.filters.minValue).toBe("0");
    expect(state.page).toBe(4);
  });
});

describe("quick calendar date ranges", () => {
  const now = new Date(2024, 2, 1, 15, 30);
  it("uses whole local calendar days, including leap-day and month boundaries", () => {
    expect(quickDateRange("today", now)).toEqual({
      createdFrom: "2024-03-01T00:00:00",
      createdTo: "2024-03-01T23:59:59",
    });
    expect(quickDateRange("yesterday", now)).toEqual({
      createdFrom: "2024-02-29T00:00:00",
      createdTo: "2024-02-29T23:59:59",
    });
    expect(quickDateRange("last7", now).createdFrom).toBe(
      "2024-02-24T00:00:00"
    );
    expect(quickDateRange("month", new Date(2024, 1, 29)).createdFrom).toBe(
      "2024-02-01T00:00:00"
    );
  });
  it("detects presets and keeps manually entered ranges custom", () => {
    expect(
      detectQuickDate(
        { ...emptyAdminFilters, ...quickDateRange("yesterday", now) },
        now
      )
    ).toBe("yesterday");
    expect(
      detectQuickDate(
        { ...emptyAdminFilters, createdFrom: "2024-03-01T15:00" },
        now
      )
    ).toBe("custom");
    expect(detectQuickDate(emptyAdminFilters, now)).toBe("all");
  });
});
