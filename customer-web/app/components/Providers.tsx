"use client";
import { useEffect, useRef, useState } from "react";
import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { toast } from "sonner";
import { I18nProvider, useI18n } from "./I18nProvider";
import { Toaster } from "./ui/sonner";
import { NotificationBootstrap } from "./NotificationCenter";
import type { Locale, Messages } from "@marketplace/shared/i18n";
import type { Currency, CurrencyConfig } from "@marketplace/shared/currency";
import { CurrencyProvider } from "./CurrencyProvider";

function QueryProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const translate = useRef(t);
  useEffect(() => {
    translate.current = t;
  }, [t]);
  const [client] = useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          onError: error => {
            toast.error(translate.current(error.message), {
              id: "operation-error",
            });
          },
        }),
        defaultOptions: {
          queries: { staleTime: 15000, retry: 1, refetchOnWindowFocus: false },
        },
      })
  );
  return (
    <QueryClientProvider client={client}>
      {children}
      <NotificationBootstrap />
      <Toaster />
    </QueryClientProvider>
  );
}

export function Providers({
  children,
  locale,
  messages,
  currency,
  currencyConfig,
}: {
  children: React.ReactNode;
  locale: Locale;
  messages: Messages;
  currency: Currency;
  currencyConfig: CurrencyConfig;
}) {
  return (
    <ThemeProvider
      attribute="data-theme"
      storageKey="cloud-nine-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <I18nProvider locale={locale} messages={messages}>
        <CurrencyProvider currency={currency} config={currencyConfig}>
          <QueryProvider>{children}</QueryProvider>
        </CurrencyProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
