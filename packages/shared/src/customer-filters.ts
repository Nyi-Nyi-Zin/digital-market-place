import { z } from "zod";
import { adminSortValues } from "./pagination";

export const customerListInput = z.object({
  query: z.string().trim().max(160).default(""),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  sort: z.enum(adminSortValues).default("newest"),
  orderHistory: z.enum(["all", "with_orders", "without_orders"]).default("all"),
});
export type CustomerListInput = z.infer<typeof customerListInput>;
