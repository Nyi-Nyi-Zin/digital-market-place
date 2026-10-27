import { z } from "zod";
import { productStatuses } from "./pagination";
import {
  baseCurrency,
  currencyInput,
  toBaseAmount,
  type CurrencyConfig,
} from "./currency";
const money = z
  .string()
  .regex(
    /^\d{1,8}(\.\d{1,2})?$/,
    "Enter a non-negative amount with up to two decimal places"
  );
export const productInput = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Enter a title with at least 2 characters.")
    .max(220),
  categoryId: z.number().int().positive(),
  price: money,
  currency: currencyInput.default(baseCurrency),
  discountPrice: money.nullable().default(null),
  shortDescription: z.string().max(500).default(""),
  description: z.string().max(30000).default(""),
  thumbnailKey: z.string().max(512).nullable().default(null),
  digitalFileKey: z.string().max(512).nullable().default(null),
  fileType: z.string().max(40).default(""),
  fileSize: z.string().max(40).default(""),
  license: z
    .string()
    .max(180)
    .default("Personal and commercial use. Redistribution prohibited."),
  tags: z.string().max(2000).default(""),
  includes: z.string().max(5000).default(""),
  status: z.enum(productStatuses).default("draft"),
  featured: z.boolean().default(false),
});
export function checkProduct(input: z.infer<typeof productInput>) {
  if (
    input.discountPrice !== null &&
    Number(input.discountPrice) >= Number(input.price)
  )
    throw new z.ZodError([
      {
        code: "custom",
        path: ["discountPrice"],
        message: "Discount price must be lower than regular price",
      },
    ]);
  return {
    ...input,
    featured: input.status === "archived" ? false : input.featured,
  };
}
// Currency is an entry choice; all catalogue prices retain one base currency.
export function baseProductInput(
  input: z.infer<typeof productInput>,
  config: CurrencyConfig
) {
  const rate = config.rates[input.currency];
  if (!rate)
    throw new z.ZodError([
      {
        code: "custom",
        path: ["currency"],
        message: "Exchange rate is not configured for this currency.",
      },
    ]);
  const { currency: _currency, ...product } = checkProduct(
    productInput.parse({
      ...input,
      price: toBaseAmount(input.price, rate),
      discountPrice:
        input.discountPrice === null
          ? null
          : toBaseAmount(input.discountPrice, rate),
    })
  );
  return product;
}
export const categoryInput = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().max(5000).default(""),
});
export const paymentMethodInput = z
  .object({
    id: z.number().int().positive().optional(),
    name: z.enum(["KBZPay", "AYA Pay", "WavePay"]),
    currency: currencyInput.default(baseCurrency),
    enabled: z.boolean(),
    accountName: z.string().trim().max(160),
    accountNumber: z.string().trim().max(80),
    instructions: z.string().max(1000).default(""),
  })
  .refine(
    value =>
      !value.enabled ||
      (value.accountName.length >= 2 && value.accountNumber.length >= 3),
    "Enabled payment methods require account details"
  );
export const evidenceInput = z.object({
  orderId: z.number().int().positive(),
  paymentMethod: z.string().min(2).max(40),
  senderName: z.string().trim().min(2).max(160),
  senderPhone: z.string().trim().min(5).max(60),
  transactionReference: z.string().max(120).default(""),
  screenshotData: z
    .string()
    .min(30)
    .max(7 * 1024 * 1024),
  screenshotContentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});
export const currency = baseCurrency;
export function formatMoney(value: number | string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    Number(value)
  );
}
