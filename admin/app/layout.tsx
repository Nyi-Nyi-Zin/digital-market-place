import type { Metadata } from "next";
import "./shadcn.css";
import { Providers } from "../components/Providers";
import { getServerI18n } from "../lib/i18n-server";
import "./admin.css";
import "./notifications.css";
import "./operations.css";

export const metadata: Metadata = {
  title: "Cloud Nine | Admin",
  description: "Cloud Nine marketplace operations",
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg", apple: "/notification-icon-192.png" },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
