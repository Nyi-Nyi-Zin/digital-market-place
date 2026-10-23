import { currency } from "./marketplace-validation";
import { localizeDigits } from "./format";
export function formatPrice(value: number | string, locale = "en-US") {
  const text = new Intl.NumberFormat(
    locale.startsWith("my") ? "en-US" : locale,
    { style: "currency", currency }
  ).format(Number(value));
  return localizeDigits(text, locale);
}

export type { PublicProduct as Product } from "./product";
