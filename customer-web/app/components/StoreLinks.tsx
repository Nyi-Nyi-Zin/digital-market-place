"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "./I18nProvider";

const authPages = new Set([
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
]);

export function StoreLinks() {
  const pathname = usePathname();
  const { t } = useI18n();
  if (authPages.has(pathname)) return null;
  return (
    <nav className="store-links shell" aria-label={t("Store information")}>
      {[
        ["/how-to-buy", "How to buy"],
        ["/about", "About Cloud Nine"],
        ["/policies", "Policies"],
        ["/support", "Support"],
        ["/faq", "FAQ"],
      ].map(([href, label]) => (
        <Link href={href} key={href}>
          {t(label)}
        </Link>
      ))}
    </nav>
  );
}
