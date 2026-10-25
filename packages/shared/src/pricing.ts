import {
  baseCurrency,
  fractionDigits,
  convertAmount,
  resolveCurrency,
  sumAmounts,
  type Currency,
  type OrderPricing,
} from "./currency";
import { localizeDigits } from "./format";
export function formatPrice(
  value: number | string,
  locale = "en-US",
  currency: Currency = baseCurrency
) {
  const text = new Intl.NumberFormat(
    locale.startsWith("my") ? "en-US" : locale,
    {
      style: "currency",
      currency,
      currencyDisplay: "code",
      minimumFractionDigits: fractionDigits(currency),
      maximumFractionDigits: fractionDigits(currency),
    }
  ).format(Number(value));
  return localizeDigits(text, locale);
}

export type { PublicProduct as Product } from "./product";

export function formatOrderTotal(order: OrderPricing, locale = "en-US") {
  return formatPrice(
    order.payableTotal ?? order.total,
    locale,
    resolveCurrency(order.currency)
  );
}
export function formatOrderItem(
  item: { unitPrice: string; payableUnitPrice: string | null },
  order: OrderPricing,
  locale = "en-US"
) {
  const currency = resolveCurrency(order.currency);
  return formatPrice(
    item.payableUnitPrice ??
      convertAmount(item.unitPrice, order.exchangeRate, currency),
    locale,
    currency
  );
}
export function formatOrderDiscount(
  order: OrderPricing & { discount: string },
  locale = "en-US"
) {
  const currency = resolveCurrency(order.currency);
  return formatPrice(
    convertAmount(order.discount, order.exchangeRate, currency),
    locale,
    currency
  );
}
export function formatOrderSubtotal(
  order: OrderPricing & { discount: string },
  locale = "en-US"
) {
  const currency = resolveCurrency(order.currency);
  return formatPrice(
    sumAmounts([
      order.payableTotal ?? order.total,
      convertAmount(order.discount, order.exchangeRate, currency),
    ]),
    locale,
    currency
  );
}
