import type { Metadata } from "next";
import "./globals.css";
import "./account.css";
import { Providers } from "./components/Providers";
import { getServerI18n } from "./lib/i18n-server";
import "./preferences.css";

export const metadata: Metadata = {
  title: "Cloud Nine | Digital products for modern creators",
  description:
    "Cloud Nine is a Myanmar-focused digital products marketplace with verified manual payment review.",
  icons: { icon: "/icon.svg" },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { locale, messages } = await getServerI18n();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <Providers locale={locale} messages={messages}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
