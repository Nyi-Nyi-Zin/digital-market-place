import { z } from "zod";

export const adminPageSize = 12;
export const productStatuses = ["draft", "published", "archived"] as const;
export const paymentStatuses = ["pending", "approved", "rejected"] as const;
export const adminPaymentMethods = ["KBZPay", "AYA Pay", "WavePay"] as const;
export const adminSortValues = [
  "newest",
  "oldest",
  "value_asc",
  "value_desc",
  "name_asc",
  "name_desc",
] as const;
export type AdminSort = (typeof adminSortValues)[number];
export const adminSortLabels: Record<AdminSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  value_asc: "Value: low to high",
  value_desc: "Value: high to low",
  name_asc: "Name: A to Z",
  name_desc: "Name: Z to A",
};
export function defaultAdminSort(section: string): AdminSort {
  return section === "categories" ? "name_asc" : "newest";
}
export function adminSortOptions(section: string): AdminSort[] {
  return [
    "newest",
    "oldest",
    ...(["products", "categories"].includes(section)
      ? (["name_asc", "name_desc"] as const)
      : []),
    ...(["products", "orders", "payments"].includes(section)
      ? (["value_asc", "value_desc"] as const)
      : []),
  ];
}
export const orderStatuses = [
  "payment_pending",
  "paid",
  "completed",
  "payment_rejected",
] as const;
export const adminStatusLabels: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  payment_pending: "Awaiting payment",
  paid: "Paid, awaiting delivery",
  completed: "Completed",
  payment_rejected: "Payment rejected",
};
export const emptyAdminFilters = {
  status: "all",
  createdFrom: "",
  createdTo: "",
  minValue: "",
  maxValue: "",
  categoryId: "",
  featured: "all",
  discount: "all",
  productId: "",
  paymentMethod: "all",
};
export type AdminFilters = typeof emptyAdminFilters;
export function adminFilterQuery(filters: AdminFilters) {
  return {
    ...filters,
    createdFrom: filters.createdFrom
      ? new Date(filters.createdFrom).toISOString()
      : "",
    createdTo: filters.createdTo
      ? new Date(new Date(filters.createdTo).getTime() + 999).toISOString()
      : "",
  };
}
const optionalDate = z.preprocess(
  value => (value === "" ? undefined : value),
  z
    .string()
    .datetime({ offset: true, message: "Enter valid creation dates." })
    .optional()
);
const optionalMoney = z.preprocess(
  value => (value === "" ? undefined : value),
  z
    .string()
    .regex(
      /^\d{1,8}(\.\d{1,2})?$/,
      "Enter a non-negative amount with up to two decimal places"
    )
    .optional()
);
const optionalId = z.preprocess(
  value => (value === "" ? undefined : value),
  z
    .string()
    .regex(/^[1-9]\d{0,9}$/)
    .refine(value => Number(value) <= 2147483647)
    .optional()
);
export const adminListInput = z
  .object({
    section: z
      .enum([
        "dashboard",
        "products",
        "categories",
        "orders",
        "payments",
        "settings",
      ])
      .default("dashboard"),
    page: z.coerce.number().int().min(1).max(2147483647).default(1),
    query: z.string().trim().max(200).default(""),
    status: z
      .enum(["all", ...productStatuses, ...paymentStatuses, ...orderStatuses])
      .default("all"),
    createdFrom: optionalDate,
    createdTo: optionalDate,
    minValue: optionalMoney,
    maxValue: optionalMoney,
    categoryId: optionalId,
    featured: z.enum(["all", "yes", "no"]).default("all"),
    discount: z.enum(["all", "discounted", "regular"]).default("all"),
    productId: optionalId,
    paymentMethod: z.enum(["all", ...adminPaymentMethods]).default("all"),
    sort: z.enum(adminSortValues).optional(),
  })
  .superRefine((input, context) => {
    if (
      input.section !== "products" &&
      (input.categoryId || input.featured !== "all" || input.discount !== "all")
    )
      context.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "Invalid filters for this section.",
      });
    if (input.section !== "orders" && input.productId)
      context.addIssue({
        code: "custom",
        path: ["productId"],
        message: "Invalid filters for this section.",
      });
    if (input.section !== "payments" && input.paymentMethod !== "all")
      context.addIssue({
        code: "custom",
        path: ["paymentMethod"],
        message: "Invalid filters for this section.",
      });
    if (input.sort && !adminSortOptions(input.section).includes(input.sort))
      context.addIssue({
        code: "custom",
        path: ["sort"],
        message: "Invalid sort for this section.",
      });
    if (
      input.createdFrom &&
      input.createdTo &&
      Date.parse(input.createdFrom) > Date.parse(input.createdTo)
    )
      context.addIssue({
        code: "custom",
        path: ["createdTo"],
        message: "End time must be on or after start time.",
      });
    if (
      input.minValue !== undefined &&
      input.maxValue !== undefined &&
      Number(input.minValue) > Number(input.maxValue)
    )
      context.addIssue({
        code: "custom",
        path: ["maxValue"],
        message: "Maximum value must be at least the minimum value.",
      });
    const statuses: readonly string[] =
      input.section === "products"
        ? productStatuses
        : input.section === "orders"
          ? [...orderStatuses, ...paymentStatuses]
          : input.section === "payments" || input.section === "dashboard"
            ? paymentStatuses
            : [];
    if (input.status !== "all" && !statuses.includes(input.status))
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Invalid status for this section.",
      });
    if (
      !["products", "orders", "payments"].includes(input.section) &&
      (input.minValue !== undefined || input.maxValue !== undefined)
    )
      context.addIssue({
        code: "custom",
        path: ["minValue"],
        message: "Value filters are unavailable for this section.",
      });
  });
export type AdminListInput = z.infer<typeof adminListInput>;
export type Pagination = {
  page: number;
  pages: number;
  pageSize: number;
  total: number;
};

export function paginationFor(
  total: number,
  requestedPage: number,
  pageSize = adminPageSize
): Pagination {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return { page: Math.min(requestedPage, pages), pages, pageSize, total };
}

export function paginationItems(
  page: number,
  pages: number
): (number | "start-gap" | "end-gap")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
  if (page <= 3) return [1, 2, 3, "end-gap", pages];
  if (page >= pages - 2) return [1, "start-gap", pages - 2, pages - 1, pages];
  return [1, "start-gap", page - 1, page, page + 1, "end-gap", pages];
}
