"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "./I18nProvider";
import { BrandMark } from "./BrandMark";

const authPages = new Set([
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
]);

const informationLinks = [
  ["/how-to-buy", "How to buy"],
  ["/about", "About Cloud Nine"],
  ["/policies", "Policies"],
  ["/support", "Support"],
  ["/faq", "FAQ"],
] as const;

const legalLinks = [
  ["/terms", "Terms of use"],
  ["/privacy", "Privacy information"],
] as const;

export function StoreFooter() {
  const pathname = usePathname();
  const { t } = useI18n();
  if (authPages.has(pathname)) return null;

  return (
    <footer className="store-footer mt-14 bg-surface">
      <div className="shell">
        <div className="grid gap-7 py-8 md:grid-cols-2 md:items-center md:gap-10">
          <div className="min-w-0">
            <Link href="/" className="footer-brand" aria-label="Cloud Nine">
              <BrandMark />
              <span>
                Cloud <span className="text-brand">Nine</span>
              </span>
            </Link>
            <p className="m-0 mt-3 text-[length:13px] leading-6 text-muted-ink">
              {t("Made for modern creators.")}
            </p>
          </div>
          <nav
            className="footer-navigation grid min-w-0 grid-cols-2 gap-x-6 gap-y-1 sm:flex sm:flex-wrap sm:gap-x-6 md:justify-end"
            aria-label={t("Store information")}
          >
            {informationLinks.map(([href, label]) => (
              <Link
                href={href}
                key={href}
                aria-current={pathname === href ? "page" : undefined}
              >
                {t(label)}
              </Link>
            ))}
          </nav>
        </div>
        <div className="footer-bottom flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p className="m-0 text-[length:11px] leading-6 text-muted-ink">
            © {new Date().getFullYear()} Cloud Nine
          </p>
          <nav
            className="footer-legal flex min-w-0 flex-wrap gap-x-5"
            aria-label={t("Policies")}
          >
            {legalLinks.map(([href, label]) => (
              <Link
                href={href}
                key={href}
                aria-current={pathname === href ? "page" : undefined}
              >
                {t(label)}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
