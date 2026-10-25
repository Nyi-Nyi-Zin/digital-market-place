import type { Metadata } from "next";
import "./shadcn.css";
import "./globals.css";
import "./account.css";
import { Providers } from "./components/Providers";
import { getServerI18n } from "./lib/i18n-server";
import "./preferences.css";
import "./notifications.css";
import "./store-pages.css";
import { StoreLinks } from "./components/StoreLinks";
import { getServerCurrency } from "./lib/currency-server";

export const metadata: Metadata = {
  title: "Cloud Nine | Digital products for modern creators",
  description:
    "Cloud Nine is a Myanmar-focused digital products marketplace with verified manual payment review.",
  icons: { icon: "/icon.svg", apple: "/notification-icon-192.png" },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [{ locale, messages }, { config, currency }] = await Promise.all([
    getServerI18n(),
    getServerCurrency(),
  ]);
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <Providers
          locale={locale}
          messages={messages}
          currency={currency}
          currencyConfig={config}
        >
          {children}
          <StoreLinks />
        </Providers>
      </body>
    </html>
  );
}
