"use client";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "./I18nProvider";
import type { Locale, Messages } from "@marketplace/shared/i18n";
export function Providers({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale: Locale;
  messages: Messages;
}) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15000, retry: 1, refetchOnWindowFocus: false },
        },
      })
  );
  return (
    <ThemeProvider
      attribute="data-theme"
      storageKey="cloud-nine-admin-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <I18nProvider locale={locale} messages={messages}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
