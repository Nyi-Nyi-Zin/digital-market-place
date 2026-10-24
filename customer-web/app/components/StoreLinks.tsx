import Link from "next/link";
import { getServerI18n } from "../lib/i18n-server";
export async function StoreLinks() {
  const { t } = await getServerI18n();
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
