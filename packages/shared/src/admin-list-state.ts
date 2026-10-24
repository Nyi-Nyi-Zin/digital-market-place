import {
  adminFilterQuery,
  adminListInput,
  defaultAdminSort,
  emptyAdminFilters,
  type AdminFilters,
  type AdminListInput,
  type AdminSort,
} from "./pagination";

export type AdminListState = {
  search: string;
  filters: AdminFilters;
  sort: AdminSort;
  page: number;
};
export type QuickDate =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "month"
  | "custom";
export const quickDateLabels: Record<QuickDate, string> = {
  all: "All time",
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 days",
  month: "This month",
  custom: "Custom dates",
};
export function localDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
export function quickDateRange(preset: QuickDate, now = new Date()) {
  if (preset === "all" || preset === "custom")
    return { createdFrom: "", createdTo: "" };
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 0);
  if (preset === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  }
  if (preset === "last7") start.setDate(start.getDate() - 6);
  if (preset === "month") start.setDate(1);
  return { createdFrom: localDateTime(start), createdTo: localDateTime(end) };
}
export function detectQuickDate(
  filters: AdminFilters,
  now = new Date()
): QuickDate {
  if (!filters.createdFrom && !filters.createdTo) return "all";
  for (const preset of ["today", "yesterday", "last7", "month"] as const) {
    const range = quickDateRange(preset, now);
    if (
      Date.parse(range.createdFrom) === Date.parse(filters.createdFrom) &&
      Date.parse(range.createdTo) === Date.parse(filters.createdTo)
    )
      return preset;
  }
  return "custom";
}
export function defaultAdminListState(
  section: AdminListInput["section"]
): AdminListState {
  return {
    search: "",
    filters: { ...emptyAdminFilters },
    sort: defaultAdminSort(section),
    page: 1,
  };
}
export function readAdminListState(
  params: URLSearchParams,
  section: AdminListInput["section"]
) {
  const parsed = adminListInput.safeParse({
    ...Object.fromEntries(params),
    section,
  });
  if (!parsed.success)
    return { state: defaultAdminListState(section), invalid: true };
  const { data } = parsed;
  const filters = { ...emptyAdminFilters };
  for (const key of Object.keys(filters) as (keyof AdminFilters)[]) {
    const value = data[key];
    if (value !== undefined)
      filters[key] =
        key === "createdFrom" || key === "createdTo"
          ? localDateTime(new Date(value))
          : value;
  }
  return {
    state: {
      search: data.query,
      filters,
      sort: data.sort ?? defaultAdminSort(section),
      page: data.page,
    },
    invalid: false,
  };
}
export function adminListUrl(
  current: URL,
  section: AdminListInput["section"],
  state: AdminListState
) {
  const url = new URL(current);
  const values = {
    ...adminFilterQuery(state.filters),
    query: state.search.trim(),
    sort: state.sort,
    page: String(state.page),
  };
  url.searchParams.delete("section");
  for (const [key, value] of Object.entries(values)) {
    url.searchParams.delete(key);
    if (
      !value ||
      (value === "all" &&
        ["status", "featured", "discount", "paymentMethod"].includes(key)) ||
      (key === "page" && value === "1") ||
      (key === "sort" && value === defaultAdminSort(section))
    )
      continue;
    url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
export type ActiveAdminFilter =
  | "query"
  | "status"
  | "created"
  | "value"
  | "categoryId"
  | "featured"
  | "discount"
  | "productId"
  | "paymentMethod";
export function activeAdminFilterKeys(
  search: string,
  filters: AdminFilters
): ActiveAdminFilter[] {
  const keys: ActiveAdminFilter[] = [];
  if (search.trim()) keys.push("query");
  if (filters.status !== "all") keys.push("status");
  if (filters.createdFrom || filters.createdTo) keys.push("created");
  if (filters.minValue || filters.maxValue) keys.push("value");
  if (filters.categoryId) keys.push("categoryId");
  if (filters.featured !== "all") keys.push("featured");
  if (filters.discount !== "all") keys.push("discount");
  if (filters.productId) keys.push("productId");
  if (filters.paymentMethod !== "all") keys.push("paymentMethod");
  return keys;
}
export function removeAdminFilter(
  state: AdminListState,
  key: ActiveAdminFilter
): AdminListState {
  const next = { ...state, filters: { ...state.filters }, page: 1 };
  if (key === "query") next.search = "";
  else if (key === "created") {
    next.filters.createdFrom = "";
    next.filters.createdTo = "";
  } else if (key === "value") {
    next.filters.minValue = "";
    next.filters.maxValue = "";
  } else next.filters[key] = emptyAdminFilters[key];
  return next;
}
