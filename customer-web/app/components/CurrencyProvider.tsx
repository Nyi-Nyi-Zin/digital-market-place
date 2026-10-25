"use client";

import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  availableCurrency,
  convertAmount,
  currencyCookie,
  sumAmounts,
  type Currency,
  type CurrencyConfig,
} from "@marketplace/shared/currency";
import { formatPrice } from "@marketplace/shared/pricing";
import { useI18n } from "./I18nProvider";

const CurrencyContext = createContext<{
  currency: Currency;
  config: CurrencyConfig;
  changingCurrency: boolean;
  changeCurrency: (currency: Currency) => void;
} | null>(null);

export function CurrencyProvider({
  children,
  config,
  currency,
}: {
  children: React.ReactNode;
  config: CurrencyConfig;
  currency: Currency;
}) {
  const router = useRouter();
  const [changingCurrency, startTransition] = useTransition();
  function changeCurrency(next: Currency) {
    if (next === currency || availableCurrency(next, config) !== next) return;
    document.cookie = `${currencyCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    const url = new URL(location.href);
    // Price filters are denominated in the selected currency.
    url.searchParams.delete("minPrice");
    url.searchParams.delete("maxPrice");
    url.searchParams.delete("page");
    startTransition(() => {
      router.replace(url.pathname + url.search + url.hash, { scroll: false });
      router.refresh();
    });
  }
  return (
    <CurrencyContext.Provider
      value={{ currency, config, changingCurrency, changeCurrency }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function usePricing() {
  const context = useContext(CurrencyContext);
  if (!context)
    throw new Error("usePricing must be used inside CurrencyProvider");
  const { intlLocale } = useI18n();
  const rate = context.config.rates[context.currency]!;
  return {
    ...context,
    convert: (value: string | number) =>
      convertAmount(value, rate, context.currency),
    price: (value: string | number) =>
      formatPrice(
        convertAmount(value, rate, context.currency),
        intlLocale,
        context.currency
      ),
    total: (values: (string | number)[]) =>
      formatPrice(
        sumAmounts(
          values.map(value => convertAmount(value, rate, context.currency))
        ),
        intlLocale,
        context.currency
      ),
  };
}

export function Price({ value }: { value: string | number }) {
  return usePricing().price(value);
}
