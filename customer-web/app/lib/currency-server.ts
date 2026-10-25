import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getStoreSettings } from "@marketplace/server/store";
import {
  availableCurrency,
  currencyConfig,
  currencyCookie,
} from "@marketplace/shared/currency";

export const getServerCurrency = cache(async () => {
  const [settings, jar] = await Promise.all([getStoreSettings(), cookies()]);
  const config = currencyConfig(settings);
  return {
    config,
    currency: availableCurrency(jar.get(currencyCookie)?.value, config),
  };
});
