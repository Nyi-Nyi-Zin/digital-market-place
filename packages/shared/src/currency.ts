import { z } from "zod";

export const currencies = ["USD", "SGD", "MMK"] as const;
export type Currency = (typeof currencies)[number];
export const currencyInput = z.enum(currencies);
export const baseCurrency = currencyInput.parse(
  process.env.NEXT_PUBLIC_MARKETPLACE_CURRENCY ?? "USD"
);
export const currencyCookie = "cloud-nine-currency";
export const exchangeRateInput = z
  .string()
  .regex(
    /^\d{1,8}(\.\d{1,8})?$/,
    "Enter a positive exchange rate with up to eight decimal places."
  )
  .refine(
    value => Number(value) > 0,
    "Exchange rate must be greater than zero."
  )
  .nullable();
export type CurrencyConfig = {
  baseCurrency: Currency;
  rates: Record<Currency, string | null>;
};
export function currencyConfig(settings: {
  usdRate: string | null;
  sgdRate: string | null;
  mmkRate: string | null;
}): CurrencyConfig {
  return {
    baseCurrency,
    rates: {
      USD: settings.usdRate,
      SGD: settings.sgdRate,
      MMK: settings.mmkRate,
      [baseCurrency]: "1",
    },
  };
}
export function resolveCurrency(value: unknown): Currency {
  return currencyInput.safeParse(value).success
    ? (value as Currency)
    : baseCurrency;
}
export function availableCurrency(
  value: unknown,
  config: CurrencyConfig
): Currency {
  const selected = resolveCurrency(value);
  return config.rates[selected] ? selected : config.baseCurrency;
}
export const fractionDigits = (currency: Currency) =>
  currency === "MMK" ? 0 : 2;

// Decimal arithmetic keeps payment rounding independent of binary float errors.
function decimal(value: string | number): [bigint, bigint] {
  const text = String(value);
  if (!/^\d+(\.\d+)?$/.test(text)) throw new Error("Invalid monetary amount");
  const [whole, fraction = ""] = text.split(".");
  return [BigInt(whole + fraction), BigInt(10) ** BigInt(fraction.length)];
}
export function convertAmount(
  value: string | number,
  rate: string,
  currency: Currency
): string {
  const [amount, scale] = decimal(value);
  const [multiplier, rateScale] = decimal(rate);
  if (multiplier <= BigInt(0))
    throw new Error("Exchange rate must be greater than zero.");
  const digits = fractionDigits(currency);
  const units = BigInt(10) ** BigInt(digits);
  const denominator = scale * rateScale;
  const numerator = amount * multiplier * units;
  const rounded =
    (numerator * BigInt(2) + denominator) / (denominator * BigInt(2));
  return digits
    ? `${rounded / units}.${String(rounded % units).padStart(digits, "0")}`
    : String(rounded);
}
export function sumAmounts(values: string[]): string {
  const cents = values.reduce((sum, value) => {
    const [amount, scale] = decimal(value);
    return sum + (amount * BigInt(100)) / scale;
  }, BigInt(0));
  return `${cents / BigInt(100)}.${String(cents % BigInt(100)).padStart(2, "0")}`;
}
export type OrderPricing = {
  currency: string;
  exchangeRate: string;
  payableTotal: string | null;
  total: string;
};
